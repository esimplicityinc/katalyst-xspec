import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freshOneTimeCode } from '../auth/otp.js';
import { generateTotp } from '../auth/totp.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-otp-fresh-'));
  const env = { AUTH_PM_OTP_SECRET: SECRET, UI_SESSION_DIR: dir, XSPEC_RUN_ID: 'otp-fresh' };
  // A fake clock that sleeping advances.
  let t = Math.floor(1_000_000_000_000 / 30_000) * 30_000 + 5_000; // 5 s into a window
  const clock = { now: () => t, sleep: async (ms: number) => void (t += ms), slept: () => t };
  return { dir, env, clock, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function otherWorker(env: Record<string, string>, now: number, user = 'pm@x') {
  const r = spawnSync(process.execPath, ['--import', 'tsx', path.join(here, 'helpers', 'otp-worker.ts')], {
    env: { ...process.env, ...env, FAKE_NOW: String(now), OTP_USER: user },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

describe('freshOneTimeCode across workers', () => {
  it("waits for the next window when another worker used this window's code", async () => {
    const { env, clock, cleanup } = setup();
    try {
      const start = clock.now();
      const theirs = otherWorker(env, start, 'shared@x');
      assert.equal(theirs, generateTotp({ secret: SECRET, timestamp: start }));
      const mine = await freshOneTimeCode('pm', { env, username: 'shared@x', now: clock.now, sleep: clock.sleep });
      assert.notEqual(mine, theirs, 'not the code the other worker used');
      assert.equal(mine, generateTotp({ secret: SECRET, timestamp: clock.now() }));
      assert.ok(clock.now() - start >= 25_000, 'waited for the next 30 s window');
    } finally {
      cleanup();
    }
  });

  it("doesn't wait for a different account sharing the same secret", async () => {
    const { env, clock, cleanup } = setup();
    try {
      const start = clock.now();
      otherWorker(env, start, 'someone-else@x');
      await freshOneTimeCode('pm', { env, username: 'mine@x', now: clock.now, sleep: clock.sleep });
      assert.equal(clock.now(), start);
    } finally {
      cleanup();
    }
  });

  it('two logins in one process: the second waits too', async () => {
    const { env, clock, cleanup } = setup();
    try {
      const first = await freshOneTimeCode('pm', { env, username: 'solo@x', now: clock.now, sleep: clock.sleep });
      const second = await freshOneTimeCode('pm', { env, username: 'solo@x', now: clock.now, sleep: clock.sleep });
      assert.notEqual(first, second);
    } finally {
      cleanup();
    }
  });
});
