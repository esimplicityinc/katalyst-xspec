import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { MailpitAdapter } from '../adapters/mail/mailpit.adapter.js';
import { emailCode, emailCodePattern, emailLink, emailLinks } from '../helpers/email.js';

// The parts of Mailpit's API the adapter uses.
type Stored = { ID: string; From: { Address: string }; To: { Address: string }[]; Subject: string; Created: string; Text: string; HTML: string };
const inbox: Stored[] = [];
let seq = 0;
function deliver(to: string, subject: string, text: string, html = '', created = new Date()) {
  inbox.push({ ID: `m${++seq}`, From: { Address: 'app@example.gov' }, To: [{ Address: to }], Subject: subject, Created: created.toISOString(), Text: text, HTML: html });
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url!, 'http://x');
  const json = (status: number, body?: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === '/api/v1/messages') {
    const limit = Number(url.searchParams.get('limit')) || 50;
    const newest = [...inbox].reverse().slice(0, limit).map(({ Text, HTML, ...summary }) => summary);
    return json(200, { total: inbox.length, messages: newest });
  }
  if (req.method === 'DELETE' && url.pathname === '/api/v1/messages') {
    inbox.length = 0;
    return json(200);
  }
  const m = /^\/api\/v1\/message\/(.+)$/.exec(url.pathname);
  const found = m && inbox.find((x) => x.ID === decodeURIComponent(m[1]));
  if (found) return json(200, found);
  json(404, { error: 'not found' });
});
let base = '';
before(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise((r) => server.close(r)));

describe('MailpitAdapter', () => {
  it('finds the newest message by recipient and subject, with its text and HTML', async () => {
    const mail = new MailpitAdapter({ baseUrl: base });
    await mail.clear();
    deliver('pm@x.com', 'Verify your email', 'old', '', new Date(Date.now() - 60_000));
    deliver('PM@x.com', 'Verify your email', 'Your code is 482913', '<p>Code <b>482913</b></p>');
    deliver('other@x.com', 'Verify your email', 'not for pm');
    deliver('pm@x.com', 'Weekly digest', 'news');

    const m = await mail.latest({ to: 'pm@x.com', subject: 'verify' });
    assert.equal(m?.text, 'Your code is 482913');
    assert.equal(m?.html, '<p>Code <b>482913</b></p>');
    assert.deepEqual(m?.to, ['PM@x.com']);
    assert.ok(m?.date instanceof Date);
    assert.equal(await mail.latest({ to: 'nobody@x.com' }), undefined);
  });

  it('since: ignores mail received before', async () => {
    const mail = new MailpitAdapter({ baseUrl: base });
    await mail.clear();
    deliver('pm@x.com', 'Reset', 'old', '', new Date(Date.now() - 60_000));
    assert.equal(await mail.latest({ to: 'pm@x.com', since: new Date(Date.now() - 5000) }), undefined);
  });

  it('waitFor waits for the message to arrive, and times out with what it looked for', async () => {
    const mail = new MailpitAdapter({ baseUrl: base, pollMs: 20 });
    await mail.clear();
    setTimeout(() => deliver('pm@x.com', 'Welcome', 'hi'), 100);
    assert.equal((await mail.waitFor({ to: 'pm@x.com' }, 2000)).subject, 'Welcome');
    await assert.rejects(mail.waitFor({ to: 'pm@x.com', subject: 'Invoice' }, 100), /No email to pm@x\.com with subject containing "Invoice" arrived within 100ms/);
  });

  it('says how to fix an unreachable Mailpit', async () => {
    const mail = new MailpitAdapter({ baseUrl: 'http://127.0.0.1:9' });
    await assert.rejects(mail.latest({}), /Mailpit at http:\/\/127\.0\.0\.1:9 is not reachable[\s\S]*MAIL_API_URL/);
  });
});

describe('email helpers', () => {
  const message = {
    text: 'Confirm: https://app.example.gov/verify?token=abc. Or visit https://app.example.gov/help',
    html: '<a href="https://app.example.gov/verify?token=abc&amp;x=1">Confirm</a> <a href="mailto:help@x">mail</a>',
  };

  it('collects links from HTML hrefs and text URLs', () => {
    assert.deepEqual(emailLinks(message), [
      'https://app.example.gov/verify?token=abc&x=1',
      'https://app.example.gov/verify?token=abc',
      'https://app.example.gov/help',
    ]);
    assert.equal(emailLink(message, '/help'), 'https://app.example.gov/help');
    assert.equal(emailLink({ text: 'none', html: '' }), undefined);
  });

  it('finds a 4-8 digit code by default, or MAIL_CODE_PATTERN (first group)', () => {
    assert.equal(emailCode({ text: 'Your sign-in code is 482913.', html: '' }), '482913');
    assert.equal(emailCode({ text: '', html: '<p>Code: <b>7731</b></p>' }), '7731');
    assert.equal(emailCode({ text: 'code: AB-12CD', html: '' }, emailCodePattern({ MAIL_CODE_PATTERN: 'code: ([A-Z0-9-]+)' })), 'AB-12CD');
    assert.equal(emailCode({ text: 'no digits', html: '' }), undefined);
    assert.throws(() => emailCodePattern({ MAIL_CODE_PATTERN: '(' }), /MAIL_CODE_PATTERN is not a valid regular expression/);
  });
});
