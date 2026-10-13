/**
 * OIDC settings, read from environment variables (API_AUTH_MODE=oidc).
 * Pure: no I/O. Client settings can be set per role with AUTH_<ROLE>_<NAME>,
 * e.g. AUTH_PM_CLIENT_ID overrides OIDC_CLIENT_ID for the "pm" role.
 * See docs/guides/authentication.md#oidc-login for the full list.
 */
import { roleEnvPrefix } from '../credentials';

type Env = Record<string, string | undefined>;

export type OidcGrantType = 'password' | 'client_credentials' | 'authorization_code';
export type OidcClientAuthMethod =
  | 'client_secret_post'
  | 'client_secret_basic'
  | 'client_secret_jwt'
  | 'private_key_jwt'
  | 'tls_client_auth'
  | 'none';
export type OidcCodeFlowDriver = 'http' | 'browser';

export type OidcTlsSettings = {
  /** PEM certificate file. */
  certPath?: string;
  /** PEM private key file. */
  keyPath?: string;
  /** PFX / PKCS#12 file (instead of cert + key). */
  pfxPath?: string;
  passphrase?: string;
  /** Skip verification of the provider's server certificate. */
  insecure: boolean;
};

export type OidcSettings = {
  role: string;
  issuer?: string;
  tokenUrl?: string;
  clientId: string;
  clientSecret?: string;
  clientAuth: OidcClientAuthMethod;
  /** PEM or JWK text, or a path to a file containing either. */
  privateKey?: string;
  keyId?: string;
  /** JWS algorithm for private_key_jwt (default from the key type). */
  signingAlg?: string;
  grantType: OidcGrantType;
  scope?: string;
  audience?: string;
  redirectUri?: string;
  codeFlowDriver: OidcCodeFlowDriver;
  login: { usernameField?: string; passwordField?: string; button?: string; timeoutMs: number };
  dpop: boolean;
  dpopAlg: string;
  tls: OidcTlsSettings;
  mtlsEndpointAliases: boolean;
  tokenCache: boolean;
  refresh: boolean;
  verifyIdTokenSignature: boolean;
  /** Which token response field to send (default access_token). */
  tokenPath?: string;
};

const GRANTS: OidcGrantType[] = ['password', 'client_credentials', 'authorization_code'];
const CLIENT_AUTH_ALIASES: Record<string, OidcClientAuthMethod> = {
  post: 'client_secret_post',
  client_secret_post: 'client_secret_post',
  basic: 'client_secret_basic',
  client_secret_basic: 'client_secret_basic',
  client_secret_jwt: 'client_secret_jwt',
  private_key_jwt: 'private_key_jwt',
  tls_client_auth: 'tls_client_auth',
  self_signed_tls_client_auth: 'tls_client_auth',
  none: 'none',
};

export type ApiAuthMode = 'login' | 'oidc' | 'ui-session';

/** API_AUTH_MODE: how the API login steps get their credentials. */
export function apiAuthMode(env: Env = process.env): ApiAuthMode {
  const mode = (env.API_AUTH_MODE || 'login').trim().toLowerCase();
  if (mode !== 'login' && mode !== 'oidc' && mode !== 'ui-session') {
    throw new Error(`API_AUTH_MODE must be "login", "oidc" or "ui-session" (got "${env.API_AUTH_MODE}")`);
  }
  return mode;
}

export function isOidcMode(env: Env = process.env): boolean {
  return apiAuthMode(env) === 'oidc';
}

function flag(value: string | undefined, fallback: boolean): boolean {
  const v = value?.trim().toLowerCase();
  if (!v) return fallback;
  return !['false', '0', 'no', 'off'].includes(v);
}

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[], fallback: T): T {
  const v = (value || fallback).trim().toLowerCase() as T;
  if (!allowed.includes(v)) {
    throw new Error(`${name} must be ${allowed.map((a) => `"${a}"`).join(', ').replace(/, ([^,]*)$/, ' or $1')} (got "${value}")`);
  }
  return v;
}

export function oidcGrantType(env: Env = process.env): OidcGrantType {
  return oneOf('OIDC_GRANT_TYPE', env.OIDC_GRANT_TYPE, GRANTS, 'password');
}

/** Whether the role's username and password are needed (password and authorization_code grants). */
export function oidcNeedsUserCredentials(env: Env = process.env): boolean {
  return oidcGrantType(env) !== 'client_credentials';
}

export function readOidcSettings(role: string, env: Env = process.env): OidcSettings {
  const prefix = roleEnvPrefix(role);
  // Per-role value, then the shared OIDC_ value.
  const client = (name: string) => env[`${prefix}_${name}`] || env[`OIDC_${name}`] || undefined;

  const grantType = oidcGrantType(env);
  const issuer = env.OIDC_ISSUER || undefined;
  const tokenUrl = env.OIDC_TOKEN_URL || undefined;
  const clientId = client('CLIENT_ID');
  const clientSecret = client('CLIENT_SECRET');
  const privateKey = client('CLIENT_PRIVATE_KEY');
  const tls = readOidcTls(env);

  if (!issuer && !tokenUrl) throw new Error('API_AUTH_MODE=oidc needs OIDC_ISSUER (recommended) or OIDC_TOKEN_URL.');
  if (!clientId) {
    throw new Error(`API_AUTH_MODE=oidc needs a client id: set OIDC_CLIENT_ID (or ${prefix}_CLIENT_ID for role "${role}").`);
  }

  const rawAuth = env.OIDC_CLIENT_AUTH?.trim().toLowerCase();
  if (rawAuth && !CLIENT_AUTH_ALIASES[rawAuth]) {
    throw new Error(
      `OIDC_CLIENT_AUTH must be one of post, basic, client_secret_jwt, private_key_jwt, tls_client_auth or none (got "${env.OIDC_CLIENT_AUTH}")`,
    );
  }
  const clientAuth: OidcClientAuthMethod = rawAuth
    ? CLIENT_AUTH_ALIASES[rawAuth]
    : privateKey
      ? 'private_key_jwt'
      : clientSecret
        ? 'client_secret_post'
        : 'none';

  if (clientAuth.startsWith('client_secret') && !clientSecret) {
    throw new Error(`OIDC_CLIENT_AUTH=${clientAuth} needs OIDC_CLIENT_SECRET (or ${prefix}_CLIENT_SECRET).`);
  }
  if (clientAuth === 'private_key_jwt' && !privateKey) {
    throw new Error(`OIDC_CLIENT_AUTH=private_key_jwt needs OIDC_CLIENT_PRIVATE_KEY (or ${prefix}_CLIENT_PRIVATE_KEY): a PEM or JWK, or a path to one.`);
  }
  if (clientAuth === 'tls_client_auth' && !tls.certPath && !tls.pfxPath) {
    throw new Error('OIDC_CLIENT_AUTH=tls_client_auth needs a client certificate: set OIDC_TLS_CERT and OIDC_TLS_KEY, or OIDC_TLS_PFX.');
  }
  const redirectUri = env.OIDC_REDIRECT_URI || undefined;
  if (grantType === 'authorization_code') {
    if (!issuer) throw new Error('OIDC_GRANT_TYPE=authorization_code needs OIDC_ISSUER (to find the authorization endpoint).');
    if (!redirectUri) {
      throw new Error('OIDC_GRANT_TYPE=authorization_code needs OIDC_REDIRECT_URI: a redirect URI registered for the client (nothing needs to listen on it).');
    }
  }

  return {
    role,
    issuer,
    tokenUrl,
    clientId,
    clientSecret,
    clientAuth,
    privateKey,
    keyId: client('CLIENT_KEY_ID'),
    signingAlg: client('CLIENT_SIGNING_ALG'),
    grantType,
    scope: env.OIDC_SCOPE || undefined,
    audience: env.OIDC_AUDIENCE || undefined,
    redirectUri,
    codeFlowDriver: oneOf('OIDC_CODE_FLOW_DRIVER', env.OIDC_CODE_FLOW_DRIVER, ['http', 'browser'] as const, 'http'),
    login: {
      usernameField: env.OIDC_LOGIN_USERNAME_FIELD || undefined,
      passwordField: env.OIDC_LOGIN_PASSWORD_FIELD || undefined,
      button: env.OIDC_LOGIN_BUTTON || undefined,
      timeoutMs: Number(env.OIDC_LOGIN_TIMEOUT) || 15_000,
    },
    dpop: flag(env.OIDC_DPOP, false),
    dpopAlg: env.OIDC_DPOP_ALG || 'ES256',
    tls,
    mtlsEndpointAliases: flag(env.OIDC_MTLS_ENDPOINT_ALIASES, false),
    tokenCache: flag(env.OIDC_TOKEN_CACHE, true),
    refresh: flag(env.OIDC_REFRESH, true),
    verifyIdTokenSignature: flag(env.OIDC_VERIFY_ID_TOKEN, true),
    tokenPath: env.API_AUTH_TOKEN_PATH || undefined,
  };
}

/** Client certificate settings (shared by every role; also presented to the API for certificate-bound tokens). */
export function readOidcTls(env: Env = process.env): OidcTlsSettings {
  const tls: OidcTlsSettings = {
    certPath: env.OIDC_TLS_CERT || undefined,
    keyPath: env.OIDC_TLS_KEY || undefined,
    pfxPath: env.OIDC_TLS_PFX || undefined,
    passphrase: env.OIDC_TLS_PASSPHRASE || undefined,
    insecure: flag(env.OIDC_TLS_INSECURE, false),
  };
  if (tls.certPath && !tls.keyPath) throw new Error("OIDC_TLS_CERT needs OIDC_TLS_KEY (the certificate's private key).");
  return tls;
}

/** Whether a client certificate is configured. */
export function hasClientCertificate(tls: OidcTlsSettings): boolean {
  return Boolean(tls.certPath || tls.pfxPath);
}
