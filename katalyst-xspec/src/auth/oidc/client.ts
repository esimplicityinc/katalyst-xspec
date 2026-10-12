/**
 * OIDC logins with openid-client: password, client_credentials and
 * authorization code + PKCE grants; client_secret_post/basic/jwt,
 * private_key_jwt, tls_client_auth (mTLS) and public clients; DPoP;
 * refresh tokens; validated ID token claims.
 *
 * Provider HTTP goes through Playwright (see transport.ts). Configurations
 * and sessions are cached per worker; a session refreshes its own token when
 * it's about to expire, so long scenarios keep working.
 */
import type * as oidc from 'openid-client';
import type { Credentials } from '../credentials';
import { selectPath } from '../../utils';
import type { OidcSettings } from './settings';
import { readOidcSettings } from './settings';
import { createPlaywrightTransport, type OidcFetch, type OidcTransport } from './transport';
import { DpopSigner } from './dpop';
import { loadClientPrivateKey } from './keys';
import { discoveryError, oidcLoginError } from './errors';
import { createBrowserAuthorize, createHttpAuthorize, type Authorize } from './code-flow';

type Env = Record<string, string | undefined>;
type OpenidClient = typeof import('openid-client');
type TokenResponse = oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;

// Loaded on first OIDC login, so projects that don't use OIDC never load it.
let openidClient: Promise<OpenidClient> | undefined;
const lib = (): Promise<OpenidClient> => (openidClient ??= import('openid-client'));

/** Refresh this long before expiry (or at half the lifetime for short-lived tokens). */
const REFRESH_MARGIN_MS = 30_000;
const DEFAULT_LIFETIME_S = 300;

export type OidcClientOptions = {
  env?: Env;
  /** HTTP for discovery and token requests; defaults to a shared Playwright transport. */
  transport?: OidcTransport;
  /** Authorization code flow driver; defaults to OIDC_CODE_FLOW_DRIVER. */
  authorize?: Authorize;
};

/** A logged-in role: the current token, its ID token claims, and per-request headers. */
export class OidcSession {
  private tokens!: TokenResponse;
  private expiresAt = 0;
  private refreshing?: Promise<void>;
  private readonly issued = new Set<string>();

  constructor(
    readonly settings: OidcSettings,
    private readonly config: oidc.Configuration,
    tokens: TokenResponse,
    private readonly dpop?: { handle: oidc.DPoPHandle; signer: DpopSigner },
  ) {
    this.setTokens(tokens);
  }

  private setTokens(tokens: TokenResponse): void {
    // Some providers omit the refresh token on refresh: keep the previous one.
    if (!tokens.refresh_token && this.tokens?.refresh_token) (tokens as { refresh_token?: string }).refresh_token = this.tokens.refresh_token;
    this.tokens = tokens;
    this.issued.add(tokens.access_token);
    if (this.settings.tokenPath) {
      try {
        this.issued.add(this.token);
      } catch {
        /* reported when the token is used */
      }
    }
    const lifetime = (tokens.expiresIn() ?? DEFAULT_LIFETIME_S) * 1000;
    this.expiresAt = Date.now() + lifetime - Math.min(REFRESH_MARGIN_MS, lifetime / 2);
  }

  /** The token sent to the API: access_token, or API_AUTH_TOKEN_PATH. */
  get token(): string {
    const path = this.settings.tokenPath;
    if (!path) return this.tokens.access_token;
    const value = (() => {
      try {
        return selectPath(this.tokens, path);
      } catch {
        return undefined;
      }
    })();
    if (typeof value !== 'string' || !value) {
      throw new Error(`OIDC login as "${this.settings.role}": no "${path}" in the token response (API_AUTH_TOKEN_PATH).`);
    }
    return value;
  }

  /** "DPoP" when the token is sender-constrained with DPoP, otherwise "Bearer". */
  get scheme(): 'Bearer' | 'DPoP' {
    return this.dpop && this.tokens.token_type?.toLowerCase() === 'dpop' && !this.settings.tokenPath ? 'DPoP' : 'Bearer';
  }

  get refreshToken(): string | undefined {
    return this.tokens.refresh_token;
  }

  /** Validated ID token claims, when the provider returned an ID token. */
  get idTokenClaims(): Record<string, unknown> | undefined {
    return this.tokens.claims() as Record<string, unknown> | undefined;
  }

  get expired(): boolean {
    return Date.now() >= this.expiresAt;
  }

  /** Refresh the token now (refresh_token grant). Throws if there's no refresh token. */
  async refresh(): Promise<void> {
    this.refreshing ??= (async () => {
      const refreshToken = this.tokens.refresh_token;
      if (!refreshToken) throw new Error(`OIDC login as "${this.settings.role}": no refresh token to renew the expired token.`);
      const o = await lib();
      try {
        this.setTokens(await o.refreshTokenGrant(this.config, refreshToken, extraParams(this.settings), { DPoP: this.dpop?.handle }));
      } catch (err) {
        throw oidcLoginError(this.settings, 'refresh_token grant', err);
      }
    })().finally(() => (this.refreshing = undefined));
    return this.refreshing;
  }

  /** Refresh if expired and possible. Returns false when the session can't be used any more. */
  async ensureFresh(): Promise<boolean> {
    if (!this.expired) return true;
    if (!this.settings.refresh || !this.tokens.refresh_token) return false;
    try {
      await this.refresh();
      return true;
    } catch {
      return false;
    }
  }

  /** Whether an Authorization header value carries a token this session issued (current or earlier). */
  owns(authorization: string): boolean {
    const [scheme, token] = authorization.trim().split(/\s+/, 2);
    return Boolean(token) && /^(bearer|dpop)$/i.test(scheme) && this.issued.has(token);
  }

  /** Headers for one API request: Authorization, plus a DPoP proof when the token is DPoP-bound. */
  async requestHeaders(method: string, url: string): Promise<Record<string, string>> {
    await this.ensureFresh();
    const token = this.token;
    if (this.scheme === 'DPoP') {
      return { Authorization: `DPoP ${token}`, DPoP: await this.dpop!.signer.proof(method, url, token) };
    }
    return { Authorization: `Bearer ${token}` };
  }

  /** Feed an API response back (DPoP nonces). Returns true when the request should be retried once. */
  afterResponse(url: string, status: number, headers: Record<string, string>): boolean {
    return this.scheme === 'DPoP' ? this.dpop!.signer.learnNonce(url, status, headers) : false;
  }
}

function extraParams(s: OidcSettings): Record<string, string> {
  const p: Record<string, string> = {};
  if (s.scope) p.scope = s.scope;
  if (s.audience) p.audience = s.audience;
  return p;
}

async function clientAuth(s: OidcSettings): Promise<oidc.ClientAuth> {
  const o = await lib();
  // Assertions are stamped nbf = iat = now; a provider whose clock is a second
  // behind rejects them as "not active". Backdate a little (expiry is unchanged).
  const tolerateSkew: oidc.ModifyAssertionOptions = {
    [o.modifyAssertion]: (_header, payload) => {
      for (const claim of ['iat', 'nbf'] as const) if (typeof payload[claim] === 'number') payload[claim] = (payload[claim] as number) - 30;
    },
  };
  switch (s.clientAuth) {
    case 'client_secret_post':
      return o.ClientSecretPost(s.clientSecret);
    case 'client_secret_basic':
      return o.ClientSecretBasic(s.clientSecret);
    case 'client_secret_jwt':
      return o.ClientSecretJwt(s.clientSecret, tolerateSkew);
    case 'private_key_jwt': {
      const { key, kid } = await loadClientPrivateKey(s.privateKey!, s.signingAlg);
      return o.PrivateKeyJwt({ key, kid: s.keyId ?? kid }, tolerateSkew);
    }
    case 'tls_client_auth':
      return o.TlsClientAuth();
    case 'none':
      return o.None();
  }
}

const isHttp = (u?: string) => Boolean(u && u.startsWith('http:'));

/**
 * Without an issuer there's nothing to validate an ID token against, so it is
 * dropped from token responses rather than trusted unvalidated.
 */
function withoutIdTokens(fetch: OidcFetch): OidcFetch {
  return async (url, init) => {
    const res = await fetch(url, init);
    if (!(res.headers.get('content-type') || '').includes('json')) return res;
    const text = await res.text();
    let json: Record<string, unknown> | undefined;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    if (json && typeof json === 'object' && 'id_token' in json) delete json.id_token;
    return new Response(json ? JSON.stringify(json) : text, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
}

async function discover(s: OidcSettings, fetch: OidcFetch, auth: oidc.ClientAuth, metadata: Partial<oidc.ClientMetadata>): Promise<oidc.Configuration> {
  const o = await lib();
  const options = { [o.customFetch]: fetch, execute: isHttp(s.issuer) ? [o.allowInsecureRequests] : [] };
  const issuer = s.issuer!;
  try {
    return await o.discovery(new URL(issuer), s.clientId, metadata, auth, options);
  } catch (err) {
    // Issuers differ on a trailing slash (Auth0 has one, Keycloak doesn't): try the other form once.
    const other = issuer.endsWith('/') ? issuer.replace(/\/+$/, '') : `${issuer}/`;
    try {
      return await o.discovery(new URL(other), s.clientId, metadata, auth, options);
    } catch {
      throw discoveryError(s, err);
    }
  }
}

async function buildConfiguration(s: OidcSettings, fetch: OidcFetch): Promise<oidc.Configuration> {
  const o = await lib();
  const auth = await clientAuth(s);
  const metadata: Partial<oidc.ClientMetadata> = {};
  if (s.mtlsEndpointAliases) metadata.use_mtls_endpoint_aliases = true;
  if (s.clientSecret) metadata.client_secret = s.clientSecret;

  let config: oidc.Configuration;
  if (s.issuer) {
    config = await discover(s, fetch, auth, metadata);
    if (s.tokenUrl) {
      const { supportsPKCE: _ignored, ...server } = config.serverMetadata();
      config = new o.Configuration({ ...(server as oidc.ServerMetadata), token_endpoint: s.tokenUrl }, s.clientId, metadata, auth);
      config[o.customFetch] = fetch;
    }
    if (s.verifyIdTokenSignature && config.serverMetadata().jwks_uri) o.enableNonRepudiationChecks(config);
  } else {
    // No discovery: the token endpoint is all we know.
    config = new o.Configuration({ issuer: new URL(s.tokenUrl!).origin, token_endpoint: s.tokenUrl! }, s.clientId, metadata, auth);
    config[o.customFetch] = withoutIdTokens(fetch);
  }
  if (isHttp(s.issuer) || isHttp(s.tokenUrl) || isHttp(config.serverMetadata().token_endpoint)) o.allowInsecureRequests(config);
  return config;
}

// Per-worker caches, shared by every adapter instance.
const transports = new Map<string, OidcTransport>();
const configurations = new Map<string, Promise<oidc.Configuration>>();
const sessions = new Map<string, OidcSession>();

/** Forget cached OIDC sessions, provider configurations and connections (e.g. after changing a password mid-run). */
export async function clearOidcTokenCache(): Promise<void> {
  sessions.clear();
  configurations.clear();
  const all = [...transports.values()];
  transports.clear();
  await Promise.all(all.map((t) => t.dispose()));
}

function sharedTransport(s: OidcSettings): OidcTransport {
  const key = JSON.stringify(s.tls);
  let t = transports.get(key);
  if (!t) {
    t = createPlaywrightTransport({ tls: s.tls });
    transports.set(key, t);
  }
  return t;
}

const configKey = (s: OidcSettings) =>
  JSON.stringify([s.issuer, s.tokenUrl, s.clientId, s.clientSecret, s.clientAuth, s.privateKey, s.keyId, s.signingAlg, s.tls, s.mtlsEndpointAliases, s.verifyIdTokenSignature]);

const sessionKey = (s: OidcSettings, creds?: Credentials) =>
  JSON.stringify([configKey(s), s.grantType, creds?.username, creds?.password, s.scope, s.audience, s.dpop, s.dpopAlg, s.redirectUri, s.tokenPath]);

export class OidcClient {
  private readonly env: Env;
  private readonly transport?: OidcTransport;
  private readonly authorize?: Authorize;

  constructor(options: OidcClientOptions = {}) {
    this.env = options.env ?? process.env;
    this.transport = options.transport;
    this.authorize = options.authorize;
  }

  settings(role: string): OidcSettings {
    return readOidcSettings(role, this.env);
  }

  /** Log in as a role, reusing a cached (and if needed refreshed) session when possible. */
  async login(role: string, creds?: Credentials): Promise<OidcSession> {
    const s = this.settings(role);
    if (s.grantType !== 'client_credentials' && !creds) {
      throw new Error(`OIDC ${s.grantType} grant needs the role's username and password (role "${role}").`);
    }
    const key = sessionKey(s, creds);
    const cached = s.tokenCache ? sessions.get(key) : undefined;
    if (cached && (await cached.ensureFresh())) return cached;

    const session = await this.newSession(s, creds);
    if (s.tokenCache) sessions.set(key, session);
    return session;
  }

  private configuration(s: OidcSettings): Promise<oidc.Configuration> {
    const transport = this.transport ?? sharedTransport(s);
    const key = this.transport ? undefined : configKey(s);
    const cached = key ? configurations.get(key) : undefined;
    if (cached) return cached;
    const created = buildConfiguration(s, transport.fetch);
    if (key) {
      configurations.set(key, created);
      created.catch(() => configurations.delete(key));
    }
    return created;
  }

  private async newSession(s: OidcSettings, creds?: Credentials): Promise<OidcSession> {
    const o = await lib();
    const config = await this.configuration(s);
    const tokenUrl = config.serverMetadata().token_endpoint;
    let dpop: { handle: oidc.DPoPHandle; signer: DpopSigner } | undefined;
    if (s.dpop) {
      const keyPair = await o.randomDPoPKeyPair(s.dpopAlg);
      dpop = { handle: o.getDPoPHandle(config, keyPair), signer: new DpopSigner(keyPair) };
    }
    const options = { DPoP: dpop?.handle };

    let tokens: TokenResponse;
    let action = `POST ${tokenUrl}`;
    try {
      if (s.grantType === 'client_credentials') {
        tokens = await o.clientCredentialsGrant(config, extraParams(s), options);
      } else if (s.grantType === 'password') {
        tokens = await o.genericGrantRequest(config, 'password', { ...extraParams(s), username: creds!.username, password: creds!.password }, options);
      } else {
        const result = await this.codeFlow(s, config, creds!, dpop?.handle);
        tokens = result.tokens;
        action = result.action;
      }
    } catch (err) {
      if ((err as { katalystOidc?: boolean }).katalystOidc) throw err;
      throw oidcLoginError(s, action, err);
    }
    return new OidcSession(s, config, tokens, dpop);
  }

  private async codeFlow(
    s: OidcSettings,
    config: oidc.Configuration,
    creds: Credentials,
    dpop?: oidc.DPoPHandle,
  ): Promise<{ tokens: TokenResponse; action: string }> {
    const o = await lib();
    const scope = s.scope ?? 'openid';
    const openid = scope.split(/\s+/).includes('openid');
    const verifier = o.randomPKCECodeVerifier();
    const state = o.randomState();
    const nonce = openid ? o.randomNonce() : undefined;
    const params: Record<string, string> = {
      redirect_uri: s.redirectUri!,
      scope,
      code_challenge: await o.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
    };
    if (nonce) params.nonce = nonce;
    if (s.audience) params.audience = s.audience;
    if (dpop) params.dpop_jkt = await dpop.calculateThumbprint();

    const url = o.buildAuthorizationUrl(config, params);
    const authorize = this.authorize ?? (s.codeFlowDriver === 'browser' ? createBrowserAuthorize() : createHttpAuthorize());
    let callback: URL;
    try {
      callback = await authorize({ url, redirectUri: s.redirectUri!, credentials: creds, settings: s });
    } catch (err) {
      // Driver errors already explain themselves.
      throw Object.assign(err as Error, { katalystOidc: true });
    }
    return {
      action: 'authorization code exchange',
      tokens: await o.authorizationCodeGrant(
        config,
        callback,
        { pkceCodeVerifier: verifier, expectedState: state, expectedNonce: nonce, idTokenExpected: openid },
        undefined,
        { DPoP: dpop },
      ),
    };
  }
}
