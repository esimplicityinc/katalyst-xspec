import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { resolveOtpSource } from '../auth/otp.js';
import { generateTotp } from '../auth/totp.js';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter.js';
import { PlaywrightUiAdapter } from '../adapters/ui/playwright-ui.adapter.js';
import type { MailMessage, MailPort, MailQuery } from '../ports/mail.port.js';
import { initWorld } from '../world.js';
import { startFakeBff } from './helpers/fake-bff.js';

/** An in-memory inbox. */
class MemoryInbox implements MailPort {
  messages: MailMessage[] = [];
  send(to: string, subject: string, text: string) {
    this.messages.push({ id: String(this.messages.length + 1), from: 'idp@x', to: [to], subject, text, html: '', date: new Date() });
  }
  async latest(q: MailQuery) {
    return [...this.messages]
      .reverse()
      .find((m) => (!q.to || m.to.includes(q.to)) && (!q.subject || m.subject.includes(q.subject)) && (!q.since || m.date >= q.since));
  }
  async waitFor(q: MailQuery, timeoutMs: number) {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const m = await this.latest(q);
      if (m) return m;
      if (Date.now() > end) throw new Error(`No email to ${q.to} arrived within ${timeoutMs}ms.`);
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  async clear() {
    this.messages = [];
  }
}

describe('resolveOtpSource', () => {
  it('TOTP by default when the role has a secret, nothing otherwise', () => {
    assert.deepEqual(resolveOtpSource('pm', { env: { AUTH_PM_OTP_SECRET: 's' } }), { kind: 'totp', settings: { secret: 's' } });
    assert.equal(resolveOtpSource('pm', { env: {} }), undefined);
  });

  it('email via AUTH_<ROLE>_OTP_SOURCE or AUTH_OTP_SOURCE, with address and subject', () => {
    assert.deepEqual(
      resolveOtpSource('pm', { env: { AUTH_PM_OTP_SOURCE: 'email', AUTH_PM_OTP_EMAIL: 'pm+otp@x', AUTH_OTP_EMAIL_SUBJECT: 'code' } }),
      { kind: 'email', to: 'pm+otp@x', subject: 'code' },
    );
    assert.deepEqual(resolveOtpSource('pm', { env: { AUTH_OTP_SOURCE: 'EMAIL' } }), { kind: 'email', to: undefined, subject: undefined });
  });

  it('a function in code wins', async () => {
    const source = resolveOtpSource('pm', { env: { AUTH_PM_OTP_SECRET: 's' }, roles: { pm: { otp: () => '123456' } } });
    assert.equal(source?.kind, 'custom');
  });

  it('names the bad setting', () => {
    assert.throws(() => resolveOtpSource('pm', { env: { AUTH_PM_OTP_SOURCE: 'sms' } }), /AUTH_PM_OTP_SOURCE must be "totp" or "email"/);
  });
});

describe('UniversalAuthAdapter.oneTimeCodeFor with other sources', () => {
  const stub = undefined as never;

  it('reads the code from the newest email to the role since the given time', async () => {
    const mail = new MemoryInbox();
    mail.send('pm@x', 'Your code', 'old code 111111');
    const since = new Date(Date.now() + 5);
    await new Promise((r) => setTimeout(r, 10));
    mail.send('pm@x', 'Your code', 'Your code is 482913.');
    const auth = new UniversalAuthAdapter({ api: stub, ui: stub, apiBaseUrl: 'http://x', mail, env: { AUTH_PM_USERNAME: 'pm@x', AUTH_PM_PASSWORD: 'p', AUTH_PM_OTP_SOURCE: 'email' } });
    assert.equal(await auth.oneTimeCodeFor('pm', { since }), '482913');
  });

  it('calls a function passed in code', async () => {
    const auth = new UniversalAuthAdapter({ api: stub, ui: stub, apiBaseUrl: 'http://x', env: {}, roles: { pm: { otp: async () => '654321' } } });
    assert.equal(await auth.oneTimeCodeFor('pm'), '654321');
  });

  it('without an inbox, says to set MAIL_API_URL', async () => {
    const auth = new UniversalAuthAdapter({ api: stub, ui: stub, apiBaseUrl: 'http://x', env: { AUTH_PM_USERNAME: 'pm@x', AUTH_PM_PASSWORD: 'p', AUTH_PM_OTP_SOURCE: 'email' } });
    await assert.rejects(auth.oneTimeCodeFor('pm'), /need a test inbox: set MAIL_API_URL/);
  });
});

let browser: Browser | undefined;
let skip: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skip = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

describe('UI login with codes from other sources', { skip }, () => {
  const mail = new MemoryInbox();
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-otp-sources-'));
  before(async () => {
    bff = await startFakeBff({
      users: { 'mailer@x': { password: 'pw', otpByEmail: true }, 'app@x': { password: 'pw', otpSecret: 'logingov-local-otp-secret' } },
      onEmail: (to, subject, text) => mail.send(to, subject, text),
    });
  });
  after(async () => {
    await bff.close();
    await browser?.close();
    fs.rmSync(sessionDir, { recursive: true, force: true });
  });

  async function login(env: Record<string, string>, roles?: ConstructorParameters<typeof UniversalAuthAdapter>[0]['roles']) {
    const context = await browser!.newContext({ baseURL: bff.appBase });
    const page = await context.newPage();
    try {
      const auth = new UniversalAuthAdapter({
        api: undefined as never,
        ui: new PlaywrightUiAdapter(page),
        mail,
        roles,
        env: { FRONTEND_URL: bff.appBase, UI_LOGIN_PATH: '/auth/start', UI_SESSION_DIR: sessionDir, ...env },
      });
      await auth.uiLoginAs(initWorld(), 'pm');
      return page.locator('h1').innerText();
    } finally {
      await context.close();
    }
  }

  it('AUTH_<ROLE>_OTP_SOURCE=email: the code from the email the provider sends', async () => {
    const text = await login({ AUTH_PM_USERNAME: 'mailer@x', AUTH_PM_PASSWORD: 'pw', AUTH_PM_OTP_SOURCE: 'email' });
    assert.equal(text, 'Welcome back');
    // A second login uses the new email, not the first one's code.
    assert.equal(await login({ AUTH_PM_USERNAME: 'mailer@x', AUTH_PM_PASSWORD: 'pw', AUTH_PM_OTP_SOURCE: 'email' }), 'Welcome back');
    assert.equal(bff.stats.otpRejected, 0);
  });

  it('a function passed in code supplies the code', async () => {
    let calls = 0;
    const text = await login({ AUTH_PM_USERNAME: 'app@x', AUTH_PM_PASSWORD: 'pw' }, {
      pm: { otp: () => (calls++, generateTotp({ secret: 'logingov-local-otp-secret', encoding: 'latin1' })) },
    });
    assert.equal(text, 'Welcome back');
    assert.equal(calls, 1);
  });
});
