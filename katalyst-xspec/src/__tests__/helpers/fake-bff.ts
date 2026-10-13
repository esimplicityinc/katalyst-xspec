// A backend-for-frontend app and a Keycloak-like identity provider, for
// browser login tests: /auth/start -> provider login pages -> /auth/callback.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { generateTotp } from '../../auth/totp.js';

export type FakeIdpOptions = {
  users: Record<string, { password: string; otpSecret?: string }>;
  /** "combined": username + password on one page (Keycloak); "identifier-first": username, Next, then password. */
  layout?: 'combined' | 'identifier-first';
  consent?: boolean;
  otpPeriod?: number;
};

const page = (title: string, body: string) =>
  `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;

function readBody(req: http.IncomingMessage): Promise<URLSearchParams> {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c)).on('end', () => resolve(new URLSearchParams(d)));
  });
}

const cookie = (req: http.IncomingMessage, name: string) => new RegExp(`${name}=([^;]+)`).exec(req.headers.cookie || '')?.[1];

export async function startFakeBff(options: FakeIdpOptions) {
  const layout = options.layout ?? 'combined';
  const period = options.otpPeriod ?? 30;
  const stats = { otpSubmissions: 0, otpRejected: 0, reusedCodes: 0, logins: 0 };
  const usedCodes = new Set<string>();
  // Provider-side login transactions: tx id -> state.
  const tx = new Map<string, { user?: string; stage: 'username' | 'password' | 'otp' | 'consent' | 'done'; redirect: string }>();
  const appSessions = new Set<string>();
  let n = 0;
  let appBase = '';
  let idpBase = '';

  const idp = http.createServer(async (req, res) => {
    const url = new URL(req.url!, idpBase);
    const html = (body: string, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'text/html' });
      res.end(body);
    };
    const redirect = (to: string, headers: Record<string, string> = {}) => {
      res.writeHead(302, { Location: to, ...headers });
      res.end();
    };
    if (url.pathname === '/realms/app/auth') {
      const id = `tx${++n}`;
      tx.set(id, { stage: layout === 'combined' ? 'password' : 'username', redirect: url.searchParams.get('redirect_uri')! });
      return redirect(`/realms/app/login-actions?tx=${id}`, { 'Set-Cookie': `kc_tx=${id}; Path=/` });
    }
    const id = cookie(req, 'kc_tx');
    const t = id ? tx.get(id) : undefined;
    if (url.pathname !== '/realms/app/login-actions' || !t) return html(page('Error', '<p>Unknown login</p>'), 400);
    const error = url.searchParams.get('error');
    const alert = error ? `<div class="alert-error" role="alert">${error}</div>` : '';
    const action = `/realms/app/login-actions?tx=${id}`;

    if (req.method === 'POST') {
      const f = await readBody(req);
      if (t.stage === 'username') {
        t.user = f.get('identifier') || '';
        t.stage = 'password';
        return redirect(action);
      }
      if (t.stage === 'password') {
        const user = layout === 'combined' ? f.get('username') || '' : t.user || '';
        if (options.users[user]?.password !== f.get('password')) {
          if (layout === 'combined') return redirect(`${action}&error=Invalid username or password.`);
          return redirect(`${action}&error=Wrong password.`);
        }
        t.user = user;
        t.stage = options.users[user].otpSecret ? 'otp' : options.consent ? 'consent' : 'done';
      } else if (t.stage === 'otp') {
        stats.otpSubmissions++;
        const code = f.get('otp') || '';
        const expected = generateTotp({ secret: options.users[t.user!].otpSecret!, encoding: 'latin1', period });
        if (usedCodes.has(`${t.user}:${code}`)) stats.reusedCodes++;
        if (code !== expected || usedCodes.has(`${t.user}:${code}`)) {
          stats.otpRejected++;
          return redirect(`${action}&error=Invalid authenticator code.`);
        }
        usedCodes.add(`${t.user}:${code}`);
        t.stage = options.consent ? 'consent' : 'done';
      } else if (t.stage === 'consent') {
        if (f.get('accept') !== 'yes') return redirect(`${action}&error=You must agree.`);
        t.stage = 'done';
      }
      if (t.stage === 'done') {
        tx.delete(id!);
        return redirect(`${t.redirect}?code=${encodeURIComponent(t.user!)}`);
      }
      return redirect(action);
    }

    if (t.stage === 'username') {
      return html(page('Sign in', `${alert}<form method="post" action="${action}">
        <label for="identifier">Email address</label><input id="identifier" name="identifier" type="email" autocomplete="username">
        <button type="submit">Next</button></form>`));
    }
    if (t.stage === 'password' && layout === 'combined') {
      return html(page('Sign in to app', `${alert}<form method="post" action="${action}">
        <label for="username">Username or email</label><input id="username" name="username" type="text">
        <label for="password">Password</label><input id="password" name="password" type="password">
        <input type="submit" id="kc-login" value="Sign In"></form>`));
    }
    if (t.stage === 'password') {
      return html(page('Enter your password', `${alert}<p>${t.user}</p><form method="post" action="${action}">
        <label for="password">Password</label><input id="password" name="password" type="password">
        <button type="submit">Verify</button></form>`));
    }
    if (t.stage === 'otp') {
      return html(page('Sign in to app', `${alert}<form method="post" action="${action}">
        <label for="otp">One-time code</label><input id="otp" name="otp" type="text" autocomplete="off">
        <input type="submit" id="kc-login" value="Sign In"></form>`));
    }
    return html(page('Grant access', `${alert}<p>App wants to access your account.</p><form method="post" action="${action}">
      <input type="hidden" name="accept" value="yes"><button type="submit">Agree and continue</button></form>`));
  });

  const app = http.createServer((req, res) => {
    const url = new URL(req.url!, appBase);
    const sid = cookie(req, 'app_sid');
    if (url.pathname === '/auth/start') {
      res.writeHead(302, { Location: `${idpBase}/realms/app/auth?redirect_uri=${encodeURIComponent(`${appBase}/auth/callback`)}` });
      return res.end();
    }
    if (url.pathname === '/auth/callback') {
      const id = `s${++n}`;
      appSessions.add(id);
      stats.logins++;
      res.writeHead(302, { Location: '/home', 'Set-Cookie': `app_sid=${id}; Path=/; HttpOnly` });
      return res.end();
    }
    if (url.pathname.startsWith('/api/')) {
      const ok = sid && appSessions.has(sid);
      res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(ok ? { session: sid } : { error: 'unauthenticated' }));
    }
    if (!sid || !appSessions.has(sid)) {
      res.writeHead(302, { Location: '/auth/start' });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(page('Home', '<h1>Welcome back</h1>'));
  });

  await new Promise<void>((r) => idp.listen(0, '127.0.0.1', r));
  await new Promise<void>((r) => app.listen(0, '127.0.0.1', r));
  // Different hosts, so the provider is a different origin (and cookies don't mix).
  idpBase = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;
  appBase = `http://localhost:${(app.address() as AddressInfo).port}`;

  return {
    appBase,
    idpBase,
    stats,
    logOutEveryone: () => appSessions.clear(),
    close: async () => {
      await new Promise((r) => idp.close(r));
      await new Promise((r) => app.close(r));
    },
  };
}
