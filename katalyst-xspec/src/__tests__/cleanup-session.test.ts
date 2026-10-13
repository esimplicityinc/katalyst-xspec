import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, request as pwRequest } from '@playwright/test';
import { defaultCleanupAuth } from '../fixtures.js';
import { closeLoginBrowser } from '../auth/ui-session.js';
import { startFakeBff } from './helpers/fake-bff.js';

let skip: string | false = false;
try {
  await (await chromium.launch()).close();
} catch (err) {
  skip = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

// defaultCleanupAuth reads process.env, like the fixtures do.
function withEnv(vars: Record<string, string>) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

describe('cleanup with API_AUTH_MODE=ui-session', { skip }, () => {
  let bff: Awaited<ReturnType<typeof startFakeBff>>;
  let restore: () => void;
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-cleanup-session-'));
  before(async () => {
    bff = await startFakeBff({ users: { 'admin@test.local': { password: 'admin-pw' }, 'ops@test.local': { password: 'ops-pw' } } });
    restore = withEnv({
      API_AUTH_MODE: 'ui-session',
      FRONTEND_URL: bff.appBase,
      UI_LOGIN_PATH: '/auth/start',
      UI_SESSION_DIR: sessionDir,
      XSPEC_RUN_ID: 'cleanup-session',
      AUTH_ADMIN_USERNAME: 'admin@test.local',
      AUTH_ADMIN_PASSWORD: 'admin-pw',
      AUTH_OPS_USERNAME: 'ops@test.local',
      AUTH_OPS_PASSWORD: 'ops-pw',
    });
  });
  after(async () => {
    restore();
    await bff.close();
    await closeLoginBrowser();
    fs.rmSync(sessionDir, { recursive: true, force: true });
  });

  it("sends the admin's session cookie, which the cookie-only API accepts", async () => {
    const ctx = await pwRequest.newContext({ baseURL: bff.appBase });
    try {
      const headers = await defaultCleanupAuth(ctx, { method: 'DELETE', url: `${bff.appBase}/api/things/1` });
      assert.match(headers.Cookie ?? '', /^app_sid=/);
      const res = await ctx.fetch('/api/things/1', { method: 'DELETE', headers });
      assert.equal(res.status(), 200);
      // Cached for the next cleanup request: no second login.
      const logins = bff.stats.logins;
      assert.deepEqual(await defaultCleanupAuth(ctx, { method: 'DELETE', url: `${bff.appBase}/api/things/2` }), headers);
      assert.equal(bff.stats.logins, logins);
    } finally {
      await ctx.dispose();
    }
  });

  it('CLEANUP_AUTH_ROLE picks another role', async () => {
    const undo = withEnv({ CLEANUP_AUTH_ROLE: 'ops' });
    const ctx = await pwRequest.newContext({ baseURL: bff.appBase });
    try {
      const ops = await defaultCleanupAuth(ctx);
      assert.ok(ops.Cookie);
      const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
      assert.ok(files.some((f) => f.startsWith('ops-')), files.join(', '));
    } finally {
      undo();
      await ctx.dispose();
    }
  });

  it('without credentials for the cleanup role, cleanup runs unauthenticated', async () => {
    const undo = withEnv({ CLEANUP_AUTH_ROLE: 'nobody' });
    const ctx = await pwRequest.newContext({ baseURL: bff.appBase });
    try {
      assert.deepEqual(await defaultCleanupAuth(ctx), {});
    } finally {
      undo();
      await ctx.dispose();
    }
  });
});
