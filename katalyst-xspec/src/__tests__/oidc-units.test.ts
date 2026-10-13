import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { decodeProtectedHeader, decodeJwt, importJWK, jwtVerify, type JWK } from 'jose';
import { isOidcMode, oidcNeedsUserCredentials, readOidcSettings } from '../auth/oidc/settings.js';
import { decodeEntities, findLoginForm, formFields, pageErrorText, parseForms } from '../auth/oidc/html-form.js';
import { DpopSigner, dpopHtu } from '../auth/oidc/dpop.js';
import { oidcHint, oidcLoginError } from '../auth/oidc/errors.js';
import { clientCertificateFor } from '../auth/oidc/transport.js';

const base = { OIDC_ISSUER: 'https://idp/realms/x', OIDC_CLIENT_ID: 'tests' };

describe('OIDC settings', () => {
  it('is only on with API_AUTH_MODE=oidc', () => {
    assert.equal(isOidcMode({}), false);
    assert.equal(isOidcMode({ OIDC_ISSUER: 'https://idp' }), false);
    assert.equal(isOidcMode({ API_AUTH_MODE: ' OIDC ' }), true);
    assert.throws(() => isOidcMode({ API_AUTH_MODE: 'saml' }), /API_AUTH_MODE must be "login", "oidc" or "ui-session"/);
  });

  it('defaults: password grant, secret in the body when there is one, public client otherwise', () => {
    const s = readOidcSettings('pm', { ...base, OIDC_CLIENT_SECRET: 's' });
    assert.equal(s.grantType, 'password');
    assert.equal(s.clientAuth, 'client_secret_post');
    assert.equal(s.codeFlowDriver, 'http');
    assert.equal(s.tokenCache, true);
    assert.equal(s.refresh, true);
    assert.equal(s.verifyIdTokenSignature, true);
    assert.equal(s.dpop, false);
    assert.equal(readOidcSettings('pm', base).clientAuth, 'none');
    assert.equal(readOidcSettings('pm', { ...base, OIDC_CLIENT_PRIVATE_KEY: 'x' }).clientAuth, 'private_key_jwt');
  });

  it('client settings can be set per role', () => {
    const env = { ...base, OIDC_CLIENT_SECRET: 'shared', AUTH_PM_CLIENT_ID: 'pm-client', AUTH_PM_CLIENT_SECRET: 'pm-secret', AUTH_PM_CLIENT_KEY_ID: 'k1' };
    const pm = readOidcSettings('pm', env);
    assert.deepEqual([pm.clientId, pm.clientSecret, pm.keyId], ['pm-client', 'pm-secret', 'k1']);
    const admin = readOidcSettings('admin', env);
    assert.deepEqual([admin.clientId, admin.clientSecret, admin.keyId], ['tests', 'shared', undefined]);
  });

  it('accepts short and standard client auth names', () => {
    for (const [given, want] of [
      ['basic', 'client_secret_basic'],
      ['client_secret_basic', 'client_secret_basic'],
      ['post', 'client_secret_post'],
      ['self_signed_tls_client_auth', 'tls_client_auth'],
    ]) {
      const env = { ...base, OIDC_CLIENT_AUTH: given, OIDC_CLIENT_SECRET: 's', OIDC_TLS_CERT: 'c.pem', OIDC_TLS_KEY: 'k.pem' };
      assert.equal(readOidcSettings('pm', env).clientAuth, want);
    }
  });

  it('only the password and code grants need user credentials', () => {
    assert.equal(oidcNeedsUserCredentials({}), true);
    assert.equal(oidcNeedsUserCredentials({ OIDC_GRANT_TYPE: 'authorization_code' }), true);
    assert.equal(oidcNeedsUserCredentials({ OIDC_GRANT_TYPE: 'client_credentials' }), false);
  });

  it('fails clearly on missing or inconsistent settings', () => {
    const cases: Array<[Record<string, string>, RegExp]> = [
      [{ OIDC_CLIENT_ID: 'c' }, /OIDC_ISSUER \(recommended\) or OIDC_TOKEN_URL/],
      [{ OIDC_ISSUER: 'https://idp' }, /OIDC_CLIENT_ID[\s\S]*AUTH_PM_CLIENT_ID/],
      [{ ...base, OIDC_GRANT_TYPE: 'implicit' }, /OIDC_GRANT_TYPE must be "password", "client_credentials" or "authorization_code"/],
      [{ ...base, OIDC_CLIENT_AUTH: 'magic' }, /OIDC_CLIENT_AUTH must be one of/],
      [{ ...base, OIDC_CLIENT_AUTH: 'basic' }, /needs OIDC_CLIENT_SECRET/],
      [{ ...base, OIDC_CLIENT_AUTH: 'private_key_jwt' }, /needs OIDC_CLIENT_PRIVATE_KEY/],
      [{ ...base, OIDC_CLIENT_AUTH: 'tls_client_auth' }, /needs a client certificate/],
      [{ ...base, OIDC_TLS_CERT: 'c.pem' }, /OIDC_TLS_CERT needs OIDC_TLS_KEY/],
      [{ ...base, OIDC_GRANT_TYPE: 'authorization_code' }, /needs OIDC_REDIRECT_URI/],
      [{ OIDC_TOKEN_URL: 'https://idp/token', OIDC_CLIENT_ID: 'c', OIDC_GRANT_TYPE: 'authorization_code', OIDC_REDIRECT_URI: 'x' }, /authorization_code needs OIDC_ISSUER/],
      [{ ...base, OIDC_CODE_FLOW_DRIVER: 'selenium' }, /OIDC_CODE_FLOW_DRIVER must be "http" or "browser"/],
    ];
    for (const [env, message] of cases) assert.throws(() => readOidcSettings('pm', env), message, JSON.stringify(env));
  });

  it('client certificates only go to https origins', () => {
    const tls = { certPath: 'c.pem', keyPath: 'k.pem', insecure: false };
    assert.deepEqual(clientCertificateFor('https://idp:8443', tls), { origin: 'https://idp:8443', certPath: 'c.pem', keyPath: 'k.pem', passphrase: undefined });
    assert.equal(clientCertificateFor('http://idp', tls), undefined);
    assert.equal(clientCertificateFor('https://idp', { insecure: false }), undefined);
    assert.deepEqual(clientCertificateFor('https://idp', { pfxPath: 'c.p12', passphrase: 'pw', insecure: false }), { origin: 'https://idp', pfxPath: 'c.p12', passphrase: 'pw' });
  });
});

describe('login form parsing', () => {
  const keycloak = `<html><head><title>Sign in to x</title></head><body>
    <!-- <form action="/decoy"><input type="password" name="decoy"></form> -->
    <div id="input-error" class="kc-feedback-text">Invalid username or password.</div>
    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="https://idp/login-actions/authenticate?session_code=a&amp;execution=b&amp;tab_id=c" method="post">
      <input tabindex="1" id="username" name="username" value="" type="text" autofocus autocomplete="off" />
      <input tabindex="2" id="password" name="password" type="password" autocomplete="off" />
      <input type="checkbox" name="rememberMe"> <input type="checkbox" name="agree" checked value="yes">
      <input type="hidden" id="id-hidden-input" name="credentialId" value="x&quot;y"/>
      <input disabled name="ignored" value="1">
      <input tabindex="4" name="login" id="kc-login" type="submit" value="Sign In"/>
      <button type="submit" name="other" value="2">Other</button>
    </form></body></html>`;

  it('finds the login form, decodes entities, skips comments/disabled/unchecked inputs', () => {
    const forms = parseForms(keycloak);
    assert.equal(forms.length, 1);
    const login = findLoginForm(forms)!;
    assert.equal(login.form.action, 'https://idp/login-actions/authenticate?session_code=a&execution=b&tab_id=c');
    assert.equal(login.form.method, 'POST');
    assert.deepEqual([login.username, login.password], ['username', 'password']);
    assert.deepEqual(formFields(login.form, { username: 'u', password: 'p' }), {
      username: 'u',
      password: 'p',
      agree: 'yes',
      credentialId: 'x"y',
      login: 'Sign In',
    });
  });

  it('identifier-first pages and explicit field names', () => {
    const page = `<form method="post"><input type="email" name="loginfmt"><input type="submit" value="Next"></form>`;
    assert.deepEqual(findLoginForm(parseForms(page)), { form: parseForms(page)[0], username: 'loginfmt', password: undefined });
    const custom = `<form><input name="acct"><input name="secret" type="text"></form>`;
    const login = findLoginForm(parseForms(custom), { usernameField: 'acct', passwordField: 'secret' })!;
    assert.deepEqual([login.username, login.password, login.form.method], ['acct', 'secret', 'GET']);
    assert.equal(findLoginForm(parseForms('<form><input name="q"></form>')), undefined);
  });

  it('reads page error text', () => {
    assert.equal(pageErrorText(keycloak), 'Invalid username or password.');
    assert.equal(pageErrorText('<p>fine</p>'), undefined);
    assert.equal(decodeEntities('&lt;a&gt; &#39;b&#x27; &amp;amp;'), "<a> 'b' &amp;");
  });
});

describe('DPoP proofs', () => {
  it('signs proofs the server can verify (htm, htu without query, ath, fresh jti)', async () => {
    const keyPair = (await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;
    const signer = new DpopSigner(keyPair);
    const proof = await signer.proof('get', 'https://api.example.com/items?page=2#x', 'tok');
    const header = decodeProtectedHeader(proof);
    assert.equal(header.typ, 'dpop+jwt');
    assert.equal(header.alg, 'ES256');
    assert.equal((header.jwk as JWK).d, undefined, 'no private key material in the header');
    const { payload } = await jwtVerify(proof, await importJWK(header.jwk as JWK, 'ES256'), { typ: 'dpop+jwt' });
    assert.equal(payload.htm, 'GET');
    assert.equal(payload.htu, 'https://api.example.com/items');
    assert.equal(payload.ath, Buffer.from(await webcrypto.subtle.digest('SHA-256', Buffer.from('tok'))).toString('base64url'));
    assert.notEqual(decodeJwt(await signer.proof('GET', 'https://api.example.com/items')).jti, payload.jti);
    assert.equal(dpopHtu('https://a.b:8443/p?q'), 'https://a.b:8443/p');
  });

  it('learns nonces and asks for one retry only when the server demands a new one', async () => {
    const keyPair = (await webcrypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair;
    const signer = new DpopSigner(keyPair);
    const url = 'https://api/x';
    const challenge = { 'WWW-Authenticate': 'DPoP error="use_dpop_nonce"', 'DPoP-Nonce': 'n1' };
    assert.equal(signer.learnNonce(url, 401, challenge), true);
    assert.equal(decodeJwt(await signer.proof('GET', url)).nonce, 'n1');
    assert.equal(signer.learnNonce(url, 401, challenge), false, 'same nonce again: no retry loop');
    assert.equal(signer.learnNonce(url, 200, { 'dpop-nonce': 'n2' }), false);
    assert.equal(decodeJwt(await signer.proof('GET', url)).nonce, 'n2');
    assert.equal(decodeProtectedHeader(await signer.proof('GET', url)).alg, 'EdDSA');
  });
});

describe('OIDC error messages', () => {
  const settings = (extra: Record<string, string> = {}) => readOidcSettings('pm', { ...base, OIDC_CLIENT_SECRET: 's', ...extra });

  it('point at the setting to fix', () => {
    assert.match(oidcHint(settings(), 'invalid_client', 401), /Check OIDC_CLIENT_ID \/ OIDC_CLIENT_SECRET/);
    // Keycloak answers a wrong client secret with unauthorized_client.
    assert.match(oidcHint(settings(), 'unauthorized_client', 401, 'Invalid client or Invalid client credentials'), /Check OIDC_CLIENT_ID/);
    assert.match(oidcHint(settings(), 'unauthorized_client', 400, 'Client authentication with client secret signed JWT failed: Token is not active'), /Check OIDC_CLIENT_ID/);
    assert.match(oidcHint(settings(), 'unauthorized_client', 400), /must allow the "password" grant/);
    assert.match(oidcHint(settings(), 'invalid_grant', 401), /Check AUTH_PM_USERNAME \/ AUTH_PM_PASSWORD/);
    assert.match(oidcHint(settings(), 'invalid_scope', 400), /OIDC_SCOPE/);
    assert.match(oidcHint(settings(), 'invalid_dpop_proof', 400, 'DPoP proof is missing'), /requires DPoP-bound tokens: set OIDC_DPOP=true/);
    assert.match(oidcHint(settings({ OIDC_DPOP: 'true' }), 'invalid_dpop_proof', 400), /rejected the DPoP proof/);
    assert.match(oidcHint(settings({ OIDC_CLIENT_PRIVATE_KEY: 'k' }), 'invalid_client', 401), /OIDC_CLIENT_PRIVATE_KEY/);
    assert.match(oidcHint(settings({ OIDC_GRANT_TYPE: 'authorization_code', OIDC_REDIRECT_URI: 'x' }), 'invalid_grant', 400), /OIDC_REDIRECT_URI/);
  });

  it('wraps provider errors with the action and the response', () => {
    const err = Object.assign(new Error('server responded with an error'), { error: 'invalid_grant', error_description: 'Invalid user credentials', status: 401 });
    const msg = oidcLoginError(settings(), 'POST https://idp/token', err).message;
    assert.match(msg, /^OIDC login as "pm" failed: POST https:\/\/idp\/token returned 401\./);
    assert.match(msg, /"error_description":"Invalid user credentials"/);
  });
});
