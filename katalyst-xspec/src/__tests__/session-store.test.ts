import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SessionStore, currentRunId, parseDuration, sessionStoreSettings, type SessionKey } from '../auth/session-store.js';

const STATE = { cookies: [{ name: 'sid', value: 's1', domain: 'x', path: '/' }], origins: [] };
const KEY: SessionKey = { role: 'Project Manager', username: 'pm@x.com', loginPath: '/login', app: 'http://app' };

let dir = '';
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-sessions-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
const store = (extra: Partial<ReturnType<typeof sessionStoreSettings>> = {}) =>
  new SessionStore({ ...sessionStoreSettings({ UI_SESSION_DIR: dir, XSPEC_RUN_ID: 'run-1' }), ...extra });

describe('session store settings', () => {
  it('defaults: .xspec/auth, 30 minutes, run scope, 2-minute lock timeout', () => {
    const s = sessionStoreSettings({ XSPEC_RUN_ID: 'r' });
    assert.equal(s.dir, path.resolve('.xspec/auth'));
    assert.equal(s.ttlMs, 30 * 60_000);
    assert.equal(s.scope, 'run');
    assert.equal(s.runId, 'r');
    assert.equal(s.lockTimeoutMs, 120_000);
  });

  it('reads UI_SESSION_DIR / _TTL / _SCOPE / _LOCK_TIMEOUT', () => {
    const s = sessionStoreSettings({ UI_SESSION_DIR: dir, UI_SESSION_TTL: '2h', UI_SESSION_SCOPE: 'Persistent', UI_SESSION_LOCK_TIMEOUT: '45s' });
    assert.deepEqual([s.dir, s.ttlMs, s.scope, s.lockTimeoutMs], [dir, 7_200_000, 'persistent', 45_000]);
  });

  it('names the bad setting', () => {
    assert.throws(() => sessionStoreSettings({ UI_SESSION_SCOPE: 'forever' }), /UI_SESSION_SCOPE must be "run" or "persistent"/);
    assert.throws(() => sessionStoreSettings({ UI_SESSION_TTL: 'soon' }), /UI_SESSION_TTL must be a duration/);
  });

  it('parseDuration: seconds by default, ms/s/m/h suffixes', () => {
    assert.deepEqual(['90', '90s', '1.5m', '2h', '250ms'].map((v) => parseDuration(v, 'X')), [90_000, 90_000, 90_000, 7_200_000, 250]);
  });

  it('the run id is the test runner (parent) process unless XSPEC_RUN_ID is set', () => {
    assert.equal(currentRunId({}), `ppid-${process.ppid}`);
    assert.equal(currentRunId({ XSPEC_RUN_ID: ' ci-42 ' }), 'ci-42');
  });
});

describe('SessionStore', () => {
  it('writes an owner-only file named after the role and reads it back', () => {
    const s = store();
    s.write(KEY, STATE);
    const file = s.fileFor(KEY);
    assert.match(path.basename(file), /^project-manager-[0-9a-f]{16}\.json$/);
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.deepEqual(s.read(KEY)?.state, STATE);
  });

  it('keeps sessions for different users, login pages and apps apart', () => {
    const s = store();
    s.write(KEY, STATE);
    for (const other of [{ username: 'other@x.com' }, { loginPath: '/auth/start' }, { app: 'http://other' }]) {
      assert.equal(s.read({ ...KEY, ...other }), undefined, JSON.stringify(other));
    }
    assert.ok(s.read({ ...KEY, role: 'project manager' }), 'role names are case-insensitive');
  });

  it('ignores sessions older than the TTL', () => {
    const s = store({ ttlMs: 1000 });
    s.write(KEY, STATE, 10_000);
    assert.ok(s.read(KEY, 10_900));
    assert.equal(s.read(KEY, 11_001), undefined);
  });

  it('scope "run" ignores sessions saved by another run; "persistent" keeps them', () => {
    store({ runId: 'run-1' }).write(KEY, STATE);
    assert.equal(store({ runId: 'run-2' }).read(KEY), undefined);
    assert.ok(store({ runId: 'run-2', scope: 'persistent' }).read(KEY));
  });

  it('ignores unreadable or foreign files', () => {
    const s = store();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(s.fileFor(KEY), 'not json');
    assert.equal(s.read(KEY), undefined);
    fs.writeFileSync(s.fileFor(KEY), JSON.stringify({ version: 2 }));
    assert.equal(s.read(KEY), undefined);
  });

  it('clear() removes one role or all of them', () => {
    const s = store();
    const other = { ...KEY, role: 'admin' };
    s.write(KEY, STATE);
    s.write(other, STATE);
    s.clear(KEY);
    assert.equal(s.read(KEY), undefined);
    assert.ok(s.read(other));
    s.clear();
    assert.equal(s.read(other), undefined);
  });

  it('withLock lets one caller at a time in', async () => {
    const s = store();
    let inside = 0;
    let maxInside = 0;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        s.withLock(KEY, async () => {
          maxInside = Math.max(maxInside, ++inside);
          await new Promise((r) => setTimeout(r, 30));
          inside--;
        }, { pollMs: 5 }),
      ),
    );
    assert.equal(maxInside, 1);
    assert.equal(fs.existsSync(`${s.fileFor(KEY)}.lock`), false, 'the lock is released');
  });

  it('releases the lock when the callback throws', async () => {
    const s = store();
    await assert.rejects(s.withLock(KEY, async () => { throw new Error('login failed'); }), /login failed/);
    assert.equal(fs.existsSync(`${s.fileFor(KEY)}.lock`), false);
  });

  it('takes over a lock left by a crashed worker, or one older than the lock timeout', async () => {
    const s = store({ lockTimeoutMs: 60_000 });
    fs.mkdirSync(dir, { recursive: true });
    const lock = `${s.fileFor(KEY)}.lock`;
    fs.writeFileSync(lock, JSON.stringify({ pid: 2 ** 22 + 12345, at: Date.now() }));
    assert.equal(await s.withLock(KEY, async () => 'dead pid'), 'dead pid');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, at: Date.now() - 61_000 }));
    assert.equal(await s.withLock(KEY, async () => 'too old'), 'too old');
  });
});

describe('SessionStore across processes', () => {
  it('four workers starting together log in once and all get the session', async () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const worker = path.join(here, 'helpers', 'session-worker.ts');
    const logins = path.join(dir, 'logins.txt');
    const run = () =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, ['--import', 'tsx', worker], {
          env: { ...process.env, UI_SESSION_DIR: dir, XSPEC_RUN_ID: 'multi', LOGINS_FILE: logins },
          stdio: ['ignore', 'pipe', 'inherit'],
        });
        let out = '';
        child.stdout.on('data', (d) => (out += d));
        child.on('exit', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`worker exited ${code}`))));
      });
    const results = await Promise.all([run(), run(), run(), run()]);
    assert.equal(fs.readFileSync(logins, 'utf8').trim().split('\n').length, 1, 'exactly one login');
    assert.deepEqual(new Set(results), new Set(['sid=from-login']));
  });
});
