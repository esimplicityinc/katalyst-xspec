import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { chromium, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { PlaywrightApiAdapter } from '../adapters/api/playwright-api.adapter.js';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter.js';
import { clearOidcTokenCache } from '../auth/oidc/client.js';
import { closeOidcBrowser } from '../auth/oidc/code-flow.js';
import { sendAuthenticated, withApiRequestAuth } from '../auth/request-auth.js';
import { initWorld } from '../world.js';
import { FakeIdp, TLS_DIR } from './helpers/fake-idp.js';

const REDIRECT = 'http://127.0.0.1:9/callback';
const ALL_GRANTS = ['password', 'client_credentials', 'authorization_code', 'refresh_token'];

const pk = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pkPem = pk.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const pkJwkFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xspec-oidc-')), 'client.jwk.json');
fs.writeFileSync(pkJwkFile, JSON.stringify({ ...pk.privateKey.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256' }));

const idp = new FakeIdp();
const tlsIdp = new FakeIdp({ tls: true });

let skipBrowser: string | false = false;
try {
  await (await chromium.launch()).close();
} catch (err) {
  skipBrowser = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

before(async () => {
  await idp.start();
  await tlsIdp.start();
  idp.clients = {
    tests: { secret: 'client-secret', grants: ALL_GRANTS, redirectUris: [REDIRECT] },
    'jwt-client': { secret: 'a-shared-secret-that-is-at-least-32-bytes', grants: ALL_GRANTS },
    'pk-client': { publicKey: pk.publicKey, grants: ALL_GRANTS, redirectUris: [REDIRECT] },
    'public-spa': { grants: ['authorization_code', 'refresh_token'], redirectUris: [REDIRECT] },
    'svc-only': { secret: 'svc-secret', grants: ['client_credentials'] },
  };
  tlsIdp.clients = { 'mtls-client': { certCn: 'mtls-client', grants: ALL_GRANTS } };
});
after(async () => {
  await closeOidcBrowser();
  await clearOidcTokenCache();
  await idp.stop();
  await tlsIdp.stop();
});
beforeEach(async () => {
  idp.reset();
  tlsIdp.reset();
  await clearOidcTokenCache();
});

const contexts: APIRequestContext[] = [];
afterEach(async () => {
  await Promise.all(contexts.splice(0).map((c) => c.dispose()));
});

const users = { AUTH_PM_USERNAME: 'pm@x.com', AUTH_PM_PASSWORD: 'pm-pass', AUTH_ADMIN_USERNAME: 'admin@x.com', AUTH_ADMIN_PASSWORD: 'admin-pass' };
const oidcEnv = (extra: Record<string, string> = {}) => ({
  API_AUTH_MODE: 'oidc',
  OIDC_ISSUER: idp.issuer,
  OIDC_CLIENT_ID: 'tests',
  OIDC_CLIENT_SECRET: 'client-secret',
  OIDC_SCOPE: 'openid',
  ...users,
  ...extra,
});

async function setup(env: Record<string, string>, { target = idp, apiCert = false }: { target?: FakeIdp; apiCert?: boolean } = {}) {
  const ctx = await pwRequest.newContext({
    baseURL: target.base,
    ignoreHTTPSErrors: true,
    ...(apiCert ? { clientCertificates: [{ origin: target.base, certPath: path.join(TLS_DIR, 'client.pem'), keyPath: path.join(TLS_DIR, 'client.key') }] } : {}),
  });
  contexts.push(ctx);
  const api = new PlaywrightApiAdapter(ctx);
  const auth = new UniversalAuthAdapter({ api, ui: undefined as never, env, apiBaseUrl: target.base });
  return { api, auth };
}

async function login(env: Record<string, string>, role = 'pm', opts: { target?: FakeIdp; apiCert?: boolean } = {}) {
  const { api, auth } = await setup(env, opts);
  const world = initWorld();
  await auth.apiLoginAs(world, role);
  const me = await sendAuthenticated(api, world, 'GET', '/me');
  return { world, me, api, auth };
}

describe('OIDC: grants and client authentication', () => {
  it('password grant with client_secret_post, discovery and validated ID token claims', async () => {
    const { world, me } = await login(oidcEnv());
    assert.equal(me.status, 200);
    assert.equal((me.json as { sub: string }).sub, 'pm@x.com');
    assert.match(world.headers.Authorization, /^Bearer /);
    assert.equal(world.idTokenClaims?.email, 'pm@x.com');
    assert.equal(world.idTokenClaims?.iss, idp.issuer);
    assert.equal(idp.lastClientAuth, 'client_secret_post');
  });

  it('client_secret_basic', async () => {
    const { me } = await login(oidcEnv({ OIDC_CLIENT_AUTH: 'basic' }));
    assert.equal(me.status, 200);
    assert.equal(idp.lastClientAuth, 'client_secret_basic');
  });

  it('client_secret_jwt', async () => {
    const { me } = await login(oidcEnv({ OIDC_CLIENT_ID: 'jwt-client', OIDC_CLIENT_SECRET: 'a-shared-secret-that-is-at-least-32-bytes', OIDC_CLIENT_AUTH: 'client_secret_jwt' }));
    assert.equal(me.status, 200);
    assert.equal(idp.lastClientAuth, 'client_secret_jwt');
    // Backdated so a provider whose clock runs slightly behind doesn't reject it as "not active" (seen with Keycloak).
    assert.ok(Number(idp.lastAssertion?.nbf) <= Date.now() / 1000 - 20, `nbf ${idp.lastAssertion?.nbf}`);
    assert.ok(Number(idp.lastAssertion?.exp) > Date.now() / 1000, 'still valid');
  });

  it('private_key_jwt from PEM text (inferred from OIDC_CLIENT_PRIVATE_KEY)', async () => {
    const { me } = await login(oidcEnv({ OIDC_CLIENT_ID: 'pk-client', OIDC_CLIENT_SECRET: '', OIDC_CLIENT_PRIVATE_KEY: pkPem }));
    assert.equal(me.status, 200);
    assert.equal(idp.lastClientAuth, 'private_key_jwt');
  });

  it('private_key_jwt from a JWK file, per role', async () => {
    const { me } = await login(oidcEnv({ AUTH_PM_CLIENT_ID: 'pk-client', AUTH_PM_CLIENT_PRIVATE_KEY: pkJwkFile, OIDC_CLIENT_AUTH: 'private_key_jwt' }));
    assert.equal(me.status, 200);
    assert.equal(idp.lastClientAuth, 'private_key_jwt');
  });

  it('client_credentials: no user credentials needed', async () => {
    const env = oidcEnv({ OIDC_GRANT_TYPE: 'client_credentials', OIDC_CLIENT_ID: 'svc-only', OIDC_CLIENT_SECRET: 'svc-secret', OIDC_SCOPE: '' });
    const { me } = await login({ ...env, AUTH_PM_USERNAME: '', AUTH_PM_PASSWORD: '' });
    assert.equal((me.json as { sub: string }).sub, 'service-account-svc-only');
  });

  it('token URL only (no issuer): works, but ID tokens are dropped rather than trusted unvalidated', async () => {
    const { world, me } = await login(oidcEnv({ OIDC_ISSUER: '', OIDC_TOKEN_URL: `${idp.issuer}/token` }));
    assert.equal(me.status, 200);
    assert.equal(world.idTokenClaims, undefined);
  });
});

describe('OIDC: authorization code + PKCE', () => {
  const codeEnv = (extra: Record<string, string> = {}) => oidcEnv({ OIDC_GRANT_TYPE: 'authorization_code', OIDC_REDIRECT_URI: REDIRECT, ...extra });

  it('http driver: submits the login form, keeps provider cookies, checks state/nonce/PKCE', async () => {
    const { world, me } = await login(codeEnv());
    assert.equal(me.status, 200);
    assert.equal(world.idTokenClaims?.email, 'pm@x.com');
    assert.equal(typeof world.idTokenClaims?.nonce, 'string');
    assert.equal(idp.counts.loginPosts, 1);
  });

  it('http driver: identifier-first pages (username, then password)', async () => {
    idp.identifierFirst = true;
    const { me } = await login(codeEnv());
    assert.equal(me.status, 200);
    assert.equal(idp.counts.loginPosts, 2);
  });

  it('http driver: wrong password reports the page error', async () => {
    await assert.rejects(login(codeEnv({ AUTH_PM_PASSWORD: 'wrong' })), /showed the login form again \("Invalid username or password\."\)[\s\S]*AUTH_PM_PASSWORD/);
  });

  it('public client (no secret) with PKCE', async () => {
    const { me } = await login(codeEnv({ OIDC_CLIENT_ID: 'public-spa', OIDC_CLIENT_SECRET: '' }));
    assert.equal(me.status, 200);
    assert.equal(idp.lastClientAuth, 'none');
  });

  it('unregistered redirect URI fails with what to check', async () => {
    await assert.rejects(login(codeEnv({ OIDC_REDIRECT_URI: 'http://127.0.0.1:9/elsewhere' })), /returned 400[\s\S]*Invalid redirect uri[\s\S]*OIDC_REDIRECT_URI/);
  });

  it('browser driver', { skip: skipBrowser }, async () => {
    idp.identifierFirst = true;
    const { world, me } = await login(codeEnv({ OIDC_CODE_FLOW_DRIVER: 'browser' }));
    assert.equal(me.status, 200);
    assert.equal(world.idTokenClaims?.email, 'pm@x.com');
  });

  it('browser driver: wrong password', { skip: skipBrowser }, async () => {
    await assert.rejects(login(codeEnv({ OIDC_CODE_FLOW_DRIVER: 'browser', AUTH_PM_PASSWORD: 'wrong' })), /login form again \("Invalid username or password\."\)/);
  });

  it('subclasses can replace the login page driver (oidcAuthorize)', async () => {
    let seen: URL | undefined;
    class MfaAuth extends UniversalAuthAdapter {
      protected async oidcAuthorize(request: Parameters<UniversalAuthAdapter['oidcAuthorize']>[0]): Promise<URL> {
        seen = request.url;
        return super.oidcAuthorize(request);
      }
    }
    const ctx = await pwRequest.newContext({ baseURL: idp.base });
    contexts.push(ctx);
    const api = new PlaywrightApiAdapter(ctx);
    const world = initWorld();
    await new MfaAuth({ api, ui: undefined as never, env: codeEnv(), apiBaseUrl: idp.base }).apiLoginAs(world, 'pm');
    assert.equal(seen?.searchParams.get('code_challenge_method'), 'S256');
    assert.equal((await sendAuthenticated(api, world, 'GET', '/me')).status, 200);
  });
});

describe('OIDC: custom steps', () => {
  it('api.sendJson(..., world.headers) gets DPoP proofs and nonce retries through the fixture wrapper', async () => {
    idp.apiDpopNonce = 'nonce-2';
    const { api: raw, auth } = await setup(oidcEnv({ OIDC_DPOP: 'true' }));
    const world = initWorld();
    const api = withApiRequestAuth(raw, () => world);
    await auth.apiLoginAs(world, 'pm');
    // What a custom step does: no knowledge of DPoP.
    const first = await api.sendJson('GET', '/me', undefined, world.headers);
    assert.equal(first.status, 200);
    assert.equal((await api.sendJson('GET', '/me', undefined, { ...world.headers })).status, 200);
  });

  it('leaves requests alone that do not carry the session token', async () => {
    const { api: raw, auth } = await setup(oidcEnv({ OIDC_DPOP: 'true' }));
    const world = initWorld();
    const api = withApiRequestAuth(raw, () => world);
    await auth.apiLoginAs(world, 'pm');
    assert.equal((await api.sendJson('GET', '/me')).status, 401, 'no headers: stays unauthenticated');
    assert.equal((await api.sendJson('GET', '/me', undefined, { Authorization: 'Bearer other' })).status, 401, 'another token is not replaced');
  });

  it('refreshes an expired bearer token for custom steps too', async () => {
    idp.accessTtl = 2;
    const { api: raw, auth } = await setup(oidcEnv());
    const world = initWorld();
    const api = withApiRequestAuth(raw, () => world);
    await auth.apiLoginAs(world, 'pm');
    const stale = { ...world.headers };
    await new Promise((r) => setTimeout(r, 2200));
    assert.equal((await api.sendJson('GET', '/me', undefined, stale)).status, 200, 'a copy of the old headers still works');
    assert.equal(idp.counts.refresh, 1);
  });
});

describe('OIDC: DPoP', () => {
  it('binds the token and signs a proof for every API request', async () => {
    const { world, me, api } = await login(oidcEnv({ OIDC_DPOP: 'true' }));
    assert.match(world.headers.Authorization, /^DPoP /);
    assert.deepEqual((me.json as { dpop: boolean }).dpop, true);
    // A second request needs a fresh proof (the API rejects replayed jti).
    assert.equal((await sendAuthenticated(api, world, 'GET', '/me?again=1')).status, 200);
    // Without the proof the bound token is useless.
    assert.equal((await api.sendJson('GET', '/me', undefined, world.headers)).status, 401);
  });

  it('retries once with the nonce the API asks for', async () => {
    idp.apiDpopNonce = 'nonce-1';
    const { me } = await login(oidcEnv({ OIDC_DPOP: 'true' }));
    assert.equal(me.status, 200);
  });

  it('with the authorization code flow (dpop_jkt)', async () => {
    const { me } = await login(oidcEnv({ OIDC_DPOP: 'true', OIDC_GRANT_TYPE: 'authorization_code', OIDC_REDIRECT_URI: REDIRECT }));
    assert.deepEqual((me.json as { dpop: boolean }).dpop, true);
  });
});

describe('OIDC: token reuse and refresh', () => {
  it('reuses a session across logins; OIDC_TOKEN_CACHE=false logs in every time', async () => {
    await login(oidcEnv());
    await login(oidcEnv());
    assert.equal(idp.counts.token, 1);
    await login(oidcEnv({ OIDC_TOKEN_CACHE: 'false' }));
    assert.equal(idp.counts.token, 2);
  });

  it('refreshes an expiring token mid-scenario and on the next login', async () => {
    idp.accessTtl = 2; // refreshed after 1s (half the lifetime)
    const { world, api } = await login(oidcEnv());
    const first = world.headers.Authorization;
    await new Promise((r) => setTimeout(r, 1200));
    assert.equal((await sendAuthenticated(api, world, 'GET', '/me')).status, 200);
    assert.equal(idp.counts.refresh, 1);
    assert.notEqual(world.headers.Authorization, first, 'world.headers carries the refreshed token');

    await new Promise((r) => setTimeout(r, 1200));
    await login(oidcEnv());
    assert.equal(idp.counts.refresh, 2, 'the next login refreshes instead of logging in again');
    assert.equal(idp.counts.token, 3);
  });

  it('DPoP-bound refresh tokens are refreshed with the same key', async () => {
    idp.accessTtl = 2;
    const { world, api } = await login(oidcEnv({ OIDC_DPOP: 'true' }));
    await new Promise((r) => setTimeout(r, 1200));
    assert.equal((await sendAuthenticated(api, world, 'GET', '/me')).status, 200);
    assert.equal(idp.counts.refresh, 1);
  });
});

describe('OIDC: mTLS', () => {
  const tlsEnv = (extra: Record<string, string> = {}) => ({
    API_AUTH_MODE: 'oidc',
    OIDC_ISSUER: tlsIdp.issuer,
    OIDC_CLIENT_ID: 'mtls-client',
    OIDC_CLIENT_AUTH: 'tls_client_auth',
    OIDC_TLS_CERT: path.join(TLS_DIR, 'client.pem'),
    OIDC_TLS_KEY: path.join(TLS_DIR, 'client.key'),
    OIDC_TLS_INSECURE: 'true',
    ...users,
    ...extra,
  });

  it('tls_client_auth with a certificate-bound token, via the mTLS endpoint aliases', async () => {
    const { me } = await login(tlsEnv({ OIDC_MTLS_ENDPOINT_ALIASES: 'true' }), 'pm', { target: tlsIdp, apiCert: true });
    assert.equal(me.status, 200);
    assert.equal((me.json as { mtls: boolean }).mtls, true);
    assert.equal(tlsIdp.lastClientAuth, 'tls_client_auth');
    assert.equal(tlsIdp.lastTokenPath, '/realm/mtls/token');
  });

  it('the bound token is rejected when the API request lacks the certificate', async () => {
    const { me } = await login(tlsEnv(), 'pm', { target: tlsIdp, apiCert: false });
    assert.equal(me.status, 401);
  });

  it('no certificate: the provider rejects the client', async () => {
    await assert.rejects(login(tlsEnv({ OIDC_CLIENT_AUTH: 'none', OIDC_TLS_CERT: '', OIDC_TLS_KEY: '' }), 'pm', { target: tlsIdp }), /invalid_client/);
  });
});

describe('OIDC: errors', () => {
  it('wrong client secret', async () => {
    await assert.rejects(login(oidcEnv({ OIDC_CLIENT_SECRET: 'nope' })), /OIDC login as "pm" failed: POST .*\/token returned 401[\s\S]*invalid_client[\s\S]*Check OIDC_CLIENT_ID \/ OIDC_CLIENT_SECRET/);
  });

  it('wrong password', async () => {
    await assert.rejects(login(oidcEnv({ AUTH_PM_PASSWORD: 'wrong' })), /invalid_grant[\s\S]*Check AUTH_PM_USERNAME \/ AUTH_PM_PASSWORD/);
  });

  it('grant not allowed for the client', async () => {
    await assert.rejects(login(oidcEnv({ OIDC_CLIENT_ID: 'svc-only', OIDC_CLIENT_SECRET: 'svc-secret' })), /unauthorized_client[\s\S]*must allow the "password" grant/);
  });

  it('ID token with a bad signature is rejected, unless OIDC_VERIFY_ID_TOKEN=false', async () => {
    idp.badIdTokenSignature = true;
    await assert.rejects(login(oidcEnv()), /ID token didn't validate[\s\S]*OIDC_VERIFY_ID_TOKEN=false/);
    await clearOidcTokenCache();
    const { me } = await login(oidcEnv({ OIDC_VERIFY_ID_TOKEN: 'false' }));
    assert.equal(me.status, 200);
  });

  it('unknown issuer', async () => {
    await assert.rejects(login(oidcEnv({ OIDC_ISSUER: `${idp.base}/nope` })), /OIDC discovery failed: GET .*\/nope\/\.well-known\/openid-configuration[\s\S]*Check OIDC_ISSUER/);
  });
});
