/**
 * A small but strict OIDC provider for tests. It checks what a real one
 * would: client authentication (secret post/basic, client_secret_jwt,
 * private_key_jwt, tls_client_auth, public), PKCE, state/nonce round trips,
 * DPoP proofs and binding, certificate-bound tokens, refresh tokens, and
 * signed ID tokens. `/me` is a protected API that enforces the same.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes, X509Certificate, type KeyObject } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { SignJWT, calculateJwkThumbprint, decodeProtectedHeader, exportJWK, generateKeyPair, importJWK, jwtVerify, type JWK } from 'jose';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TLS_DIR = path.resolve(here, '../fixtures/tls');

export type FakeClient = {
  secret?: string;
  /** Public key for private_key_jwt. */
  publicKey?: KeyObject | CryptoKey;
  /** Client certificate CN for tls_client_auth. */
  certCn?: string;
  redirectUris?: string[];
  grants: string[];
};

type Code = { username: string; clientId: string; redirectUri: string; challenge: string; nonce?: string; scope: string; dpopJkt?: string };
type Token = { sub: string; clientId: string; exp: number; jkt?: string; x5t?: string };

const b64u = (b: Buffer) => b.toString('base64url');
const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest();

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c)).on('end', () => resolve(d));
  });
}

export class FakeIdp {
  users: Record<string, { password: string; email: string }> = {
    'pm@x.com': { password: 'pm-pass', email: 'pm@x.com' },
    'admin@x.com': { password: 'admin-pass', email: 'admin@x.com' },
  };
  clients: Record<string, FakeClient> = {};
  /** Access token lifetime in seconds. */
  accessTtl = 300;
  /** Login page shows the username and password on separate pages. */
  identifierFirst = false;
  /** Nonce the protected API requires in DPoP proofs (undefined: none). */
  apiDpopNonce?: string;
  /** Sign ID tokens with a key that isn't in the JWKS. */
  badIdTokenSignature = false;
  /** Token endpoint path of the last token request. */
  lastTokenPath?: string;
  /** Counters, for asserting what happened. */
  counts = { token: 0, refresh: 0, authorize: 0, loginPosts: 0 };
  lastClientAuth?: string;
  /** Claims of the last client assertion (client_secret_jwt / private_key_jwt). */
  lastAssertion?: Record<string, unknown>;

  base = '';
  private server!: http.Server | https.Server;
  private signingKey!: CryptoKey;
  private jwk!: JWK;
  private codes = new Map<string, Code>();
  private sessions = new Map<string, URLSearchParams>();
  private tokens = new Map<string, Token>();
  private refreshTokens = new Map<string, { username?: string; clientId: string; scope: string; jkt?: string }>();
  private seenJti = new Set<string>();

  constructor(private readonly opts: { tls?: boolean } = {}) {}

  get issuer(): string {
    return `${this.base}/realm`;
  }

  async start(): Promise<this> {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    this.signingKey = privateKey as CryptoKey;
    this.jwk = { ...(await exportJWK(publicKey)), kid: 'idp-key', alg: 'RS256', use: 'sig' };
    const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
      this.handle(req, res).catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', error_description: String(err) }));
      });
    };
    this.server = this.opts.tls
      ? https.createServer(
          {
            key: fs.readFileSync(path.join(TLS_DIR, 'server.key')),
            cert: fs.readFileSync(path.join(TLS_DIR, 'server.pem')),
            ca: fs.readFileSync(path.join(TLS_DIR, 'ca.pem')),
            requestCert: true,
            rejectUnauthorized: false,
          },
          handler,
        )
      : http.createServer(handler);
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', () => r()));
    this.base = `${this.opts.tls ? 'https' : 'http'}://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  async stop(): Promise<void> {
    (this.server as http.Server).closeAllConnections?.();
    await new Promise((r) => this.server.close(r));
  }

  reset(): void {
    this.counts = { token: 0, refresh: 0, authorize: 0, loginPosts: 0 };
    this.accessTtl = 300;
    this.identifierFirst = false;
    this.apiDpopNonce = undefined;
    this.lastClientAuth = undefined;
    this.badIdTokenSignature = false;
    this.lastTokenPath = undefined;
  }

  private send(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
    const isHtml = typeof body === 'string';
    res.writeHead(status, { 'Content-Type': isHtml ? 'text/html' : 'application/json', 'Cache-Control': 'no-store', ...headers });
    res.end(isHtml ? body : JSON.stringify(body));
  }

  private peerCert(req: http.IncomingMessage): X509Certificate | undefined {
    const socket = req.socket as TLSSocket;
    const raw = socket.getPeerCertificate?.()?.raw;
    return raw?.length ? new X509Certificate(raw) : undefined;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url!, this.base);
    const p = url.pathname;
    if (p === '/realm/.well-known/openid-configuration') {
      return this.send(res, 200, {
        issuer: this.issuer,
        authorization_endpoint: `${this.issuer}/authorize`,
        token_endpoint: `${this.issuer}/token`,
        jwks_uri: `${this.issuer}/jwks`,
        response_types_supported: ['code'],
        code_challenge_methods_supported: ['S256'],
        dpop_signing_alg_values_supported: ['ES256', 'RS256', 'PS256', 'EdDSA'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'client_secret_jwt', 'private_key_jwt', 'tls_client_auth', 'none'],
        ...(this.opts.tls ? { mtls_endpoint_aliases: { token_endpoint: `${this.issuer}/mtls/token` } } : {}),
      });
    }
    if (p === '/realm/jwks') return this.send(res, 200, { keys: [this.jwk] });
    if (p === '/realm/authorize') return this.authorize(url, res);
    if (p === '/realm/login' && req.method === 'POST') return this.loginPost(req, url, res);
    if ((p === '/realm/token' || p === '/realm/mtls/token') && req.method === 'POST') return this.token(req, res);
    if (p === '/me') return this.me(req, url, res);
    return this.send(res, 404, { error: 'not_found' });
  }

  // ── Authorization endpoint + login pages ───────────────────────────────────
  private loginPage(sessionId: string, step: 'both' | 'username' | 'password', error?: string): string {
    const action = `${this.issuer}/login?session=${sessionId}&amp;step=${step}`;
    const user = step !== 'password' ? '<label for="username">Username or email</label><input id="username" name="username" type="text" autocomplete="username">' : '';
    const pass = step !== 'username' ? '<label for="password">Password</label><input id="password" name="password" type="password">' : '';
    return `<!doctype html><html><head><title>Sign in to Fake IdP</title></head><body>
      ${error ? `<div class="alert-error"><span>${error}</span></div>` : ''}
      <form id="kc-form-login" method="post" action="${action}">
        <input type="hidden" name="csrf" value="tok&amp;en">
        ${user}${pass}
        <input type="submit" name="login" value="Sign In">
        <input type="submit" name="cancel" value="Cancel">
      </form></body></html>`;
  }

  private authorize(url: URL, res: http.ServerResponse) {
    this.counts.authorize++;
    const q = url.searchParams;
    const client = this.clients[q.get('client_id') || ''];
    if (!client || !client.grants.includes('authorization_code')) return this.send(res, 400, '<title>Error</title><p class="error">Client not allowed</p>');
    if (!client.redirectUris?.includes(q.get('redirect_uri') || '')) return this.send(res, 400, '<title>Error</title><p class="error">Invalid redirect uri</p>');
    if (q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) {
      return this.send(res, 400, '<title>Error</title><p class="error">PKCE required</p>');
    }
    const sessionId = b64u(randomBytes(9));
    this.sessions.set(sessionId, q);
    return this.send(res, 200, this.loginPage(sessionId, this.identifierFirst ? 'username' : 'both'), {
      'Set-Cookie': `idp_session=${sessionId}; Path=/; HttpOnly`,
    });
  }

  private async loginPost(req: http.IncomingMessage, url: URL, res: http.ServerResponse) {
    this.counts.loginPosts++;
    const sessionId = url.searchParams.get('session') || '';
    const q = this.sessions.get(sessionId);
    const cookie = /idp_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    if (!q || cookie !== sessionId) return this.send(res, 400, '<title>Error</title><p class="error">Cookie not found</p>');
    const f = new URLSearchParams(await readBody(req));
    if (f.get('csrf') !== 'tok&en' || f.get('login') !== 'Sign In' || f.has('cancel')) return this.send(res, 400, '<p class="error">Bad form</p>');

    const step = url.searchParams.get('step');
    if (step === 'username') {
      this.sessions.set(sessionId, new URLSearchParams([...q, ['login_hint', f.get('username') || '']]));
      return this.send(res, 200, this.loginPage(sessionId, 'password'));
    }
    const username = step === 'password' ? q.get('login_hint') || '' : f.get('username') || '';
    if (this.users[username]?.password !== f.get('password')) {
      return this.send(res, 200, this.loginPage(sessionId, this.identifierFirst ? 'password' : 'both', 'Invalid username or password.'));
    }
    const code = b64u(randomBytes(16));
    this.codes.set(code, {
      username,
      clientId: q.get('client_id')!,
      redirectUri: q.get('redirect_uri')!,
      challenge: q.get('code_challenge')!,
      nonce: q.get('nonce') || undefined,
      scope: q.get('scope') || '',
      dpopJkt: q.get('dpop_jkt') || undefined,
    });
    const target = new URL(q.get('redirect_uri')!);
    target.searchParams.set('code', code);
    if (q.get('state')) target.searchParams.set('state', q.get('state')!);
    target.searchParams.set('iss', this.issuer);
    return this.send(res, 302, '', { Location: target.href });
  }

  // ── Token endpoint ─────────────────────────────────────────────────────────
  private async authenticateClient(req: http.IncomingMessage, f: URLSearchParams): Promise<{ id: string; client: FakeClient } | undefined> {
    const basic = /^Basic (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (basic) {
      const [id, secret] = Buffer.from(basic, 'base64').toString().split(':').map((s) => decodeURIComponent(s.replace(/\+/g, ' ')));
      this.lastClientAuth = 'client_secret_basic';
      return this.clients[id]?.secret === secret ? { id, client: this.clients[id] } : undefined;
    }
    const assertion = f.get('client_assertion');
    if (assertion) {
      const { alg } = decodeProtectedHeader(assertion);
      const id = f.get('client_id') || '';
      const client = this.clients[id];
      if (!client) return undefined;
      const key = alg?.startsWith('HS') ? new TextEncoder().encode(client.secret) : client.publicKey;
      if (!key) return undefined;
      try {
        const { payload } = await jwtVerify(assertion, key as CryptoKey, { issuer: id, subject: id });
        const aud = ([] as unknown[]).concat(payload.aud);
        if (!aud.some((a) => a === this.issuer || String(a).endsWith('/token'))) return undefined;
        if (!payload.jti || this.seenJti.has(payload.jti)) return undefined;
        this.lastAssertion = payload as Record<string, unknown>;
        this.seenJti.add(payload.jti);
        this.lastClientAuth = alg?.startsWith('HS') ? 'client_secret_jwt' : 'private_key_jwt';
        return { id, client };
      } catch {
        return undefined;
      }
    }
    const id = f.get('client_id') || '';
    const client = this.clients[id];
    if (!client) return undefined;
    if (client.certCn) {
      this.lastClientAuth = 'tls_client_auth';
      return this.peerCert(req)?.subject.includes(`CN=${client.certCn}`) ? { id, client } : undefined;
    }
    if (client.secret === undefined && !client.publicKey) {
      this.lastClientAuth = 'none';
      return { id, client };
    }
    this.lastClientAuth = 'client_secret_post';
    return client.secret !== undefined && f.get('client_secret') === client.secret ? { id, client } : undefined;
  }

  private async verifyDpop(proof: string, method: string, url: string, accessToken?: string): Promise<{ jkt: string; nonce?: unknown }> {
    const header = decodeProtectedHeader(proof);
    if (header.typ !== 'dpop+jwt' || !header.jwk) throw new Error('bad header');
    const { payload } = await jwtVerify(proof, await importJWK(header.jwk as JWK, header.alg), { typ: 'dpop+jwt' });
    const u = new URL(url);
    if (payload.htm !== method || payload.htu !== `${u.origin}${u.pathname}`) throw new Error(`htm/htu mismatch: ${payload.htm} ${payload.htu}`);
    if (Math.abs(Number(payload.iat) - Date.now() / 1000) > 60) throw new Error('stale iat');
    if (!payload.jti || this.seenJti.has(String(payload.jti))) throw new Error('replayed jti');
    this.seenJti.add(String(payload.jti));
    if (accessToken && payload.ath !== b64u(sha256(accessToken))) throw new Error('ath mismatch');
    return { jkt: await calculateJwkThumbprint(header.jwk as JWK), nonce: payload.nonce };
  }

  private async issue(sub: string, clientId: string, scope: string, extras: { nonce?: string; jkt?: string; x5t?: string; refresh?: boolean }) {
    const accessToken = b64u(randomBytes(24));
    this.tokens.set(accessToken, { sub, clientId, exp: Date.now() + this.accessTtl * 1000, jkt: extras.jkt, x5t: extras.x5t });
    const body: Record<string, unknown> = { access_token: accessToken, token_type: extras.jkt ? 'DPoP' : 'Bearer', expires_in: this.accessTtl, scope };
    if (extras.refresh !== false) {
      const rt = b64u(randomBytes(24));
      this.refreshTokens.set(rt, { username: this.users[sub] ? sub : undefined, clientId, scope, jkt: extras.jkt });
      body.refresh_token = rt;
    }
    if (scope.split(' ').includes('openid')) {
      body.id_token = await new SignJWT({ email: this.users[sub]?.email, preferred_username: sub, ...(extras.nonce ? { nonce: extras.nonce } : {}) })
        .setProtectedHeader({ alg: 'RS256', kid: 'idp-key' })
        .setIssuer(this.issuer)
        .setAudience(clientId)
        .setSubject(sub)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(this.badIdTokenSignature ? ((await generateKeyPair('RS256')).privateKey as CryptoKey) : this.signingKey);
    }
    return body;
  }

  private async token(req: http.IncomingMessage, res: http.ServerResponse) {
    this.counts.token++;
    this.lastTokenPath = new URL(req.url!, this.base).pathname;
    const f = new URLSearchParams(await readBody(req));
    const authed = await this.authenticateClient(req, f);
    if (!authed) return this.send(res, 401, { error: 'invalid_client', error_description: 'Invalid client credentials' });
    const grant = f.get('grant_type') || '';
    if (!authed.client.grants.includes(grant)) return this.send(res, 400, { error: 'unauthorized_client', error_description: `Client not allowed for ${grant}` });

    let jkt: string | undefined;
    const proof = req.headers.dpop as string | undefined;
    if (proof) {
      try {
        jkt = (await this.verifyDpop(proof, 'POST', `${this.base}${req.url}`)).jkt;
      } catch (err) {
        return this.send(res, 400, { error: 'invalid_dpop_proof', error_description: String(err) });
      }
    }
    const cert = this.peerCert(req);
    const x5t = cert && authed.client.certCn ? b64u(sha256(cert.raw)) : undefined;
    const scope = f.get('scope') || '';

    if (grant === 'password') {
      const username = f.get('username') || '';
      if (this.users[username]?.password !== f.get('password')) return this.send(res, 401, { error: 'invalid_grant', error_description: 'Invalid user credentials' });
      return this.send(res, 200, await this.issue(username, authed.id, scope, { jkt, x5t }));
    }
    if (grant === 'client_credentials') {
      return this.send(res, 200, await this.issue(`service-account-${authed.id}`, authed.id, scope, { jkt, x5t, refresh: false }));
    }
    if (grant === 'authorization_code') {
      const code = this.codes.get(f.get('code') || '');
      this.codes.delete(f.get('code') || '');
      if (!code || code.clientId !== authed.id) return this.send(res, 400, { error: 'invalid_grant', error_description: 'Code not valid' });
      if (code.redirectUri !== f.get('redirect_uri')) return this.send(res, 400, { error: 'invalid_grant', error_description: 'Incorrect redirect_uri' });
      if (b64u(sha256(f.get('code_verifier') || '')) !== code.challenge) return this.send(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
      if (code.dpopJkt && code.dpopJkt !== jkt) return this.send(res, 400, { error: 'invalid_dpop_proof', error_description: 'dpop_jkt mismatch' });
      return this.send(res, 200, await this.issue(code.username, authed.id, code.scope, { nonce: code.nonce, jkt, x5t }));
    }
    if (grant === 'refresh_token') {
      this.counts.refresh++;
      const rt = this.refreshTokens.get(f.get('refresh_token') || '');
      if (!rt || rt.clientId !== authed.id) return this.send(res, 400, { error: 'invalid_grant', error_description: 'Invalid refresh token' });
      if (rt.jkt && rt.jkt !== jkt) return this.send(res, 400, { error: 'invalid_dpop_proof', error_description: 'refresh token is DPoP-bound' });
      this.refreshTokens.delete(f.get('refresh_token') || '');
      return this.send(res, 200, await this.issue(rt.username ?? `service-account-${authed.id}`, authed.id, rt.scope, { jkt, x5t }));
    }
    return this.send(res, 400, { error: 'unsupported_grant_type' });
  }

  // ── Protected API ──────────────────────────────────────────────────────────
  private async me(req: http.IncomingMessage, url: URL, res: http.ServerResponse) {
    const [scheme, value] = (req.headers.authorization || '').split(' ');
    const token = value ? this.tokens.get(value) : undefined;
    if (!token || token.exp < Date.now()) return this.send(res, 401, { error: 'invalid_token' }, { 'WWW-Authenticate': 'Bearer error="invalid_token"' });
    if (token.jkt) {
      if (scheme !== 'DPoP') return this.send(res, 401, { error: 'invalid_token', error_description: 'DPoP-bound token sent as Bearer' });
      try {
        const { jkt, nonce } = await this.verifyDpop(String(req.headers.dpop || ''), req.method || 'GET', url.href, value);
        if (jkt !== token.jkt) throw new Error('jkt mismatch');
        if (this.apiDpopNonce && nonce !== this.apiDpopNonce) {
          return this.send(res, 401, { error: 'use_dpop_nonce' }, { 'WWW-Authenticate': 'DPoP error="use_dpop_nonce"', 'DPoP-Nonce': this.apiDpopNonce });
        }
      } catch (err) {
        return this.send(res, 401, { error: 'invalid_dpop_proof', error_description: String(err) });
      }
    } else if (scheme !== 'Bearer') {
      return this.send(res, 401, { error: 'invalid_token' });
    }
    if (token.x5t) {
      const cert = this.peerCert(req);
      if (!cert || b64u(sha256(cert.raw)) !== token.x5t) return this.send(res, 401, { error: 'invalid_token', error_description: 'certificate-bound token without its certificate' });
    }
    return this.send(res, 200, { sub: token.sub, client: token.clientId, dpop: Boolean(token.jkt), mtls: Boolean(token.x5t) });
  }
}
