/**
 * Saved UI login sessions, shared by every worker of a test run.
 *
 * One file per role (+ username, login page and app) under UI_SESSION_DIR.
 * The first worker that needs a role takes a lock and logs in; the others wait
 * for the lock and read what it saved, so each role logs in once per run. That
 * matters for one-time codes, which a provider accepts only once per window.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { UiSessionState } from '../ports/ui.port';
import { DEFAULT_SESSION_DIR, writeSecretFile } from './secrets';

type Env = Record<string, string | undefined>;

export type SessionScope = 'run' | 'persistent';

export type SessionStoreSettings = {
  dir: string;
  ttlMs: number;
  scope: SessionScope;
  /** Identifies the current test run; sessions from other runs are ignored when scope is "run". */
  runId: string;
  /** A lock older than this is assumed abandoned (crashed worker) and taken over. */
  lockTimeoutMs: number;
};

export type SavedSession = {
  version: 1;
  role: string;
  username: string;
  runId: string;
  savedAt: number;
  state: UiSessionState;
};

export type SessionKey = { role: string; username: string; loginPath: string; app: string };

const DEFAULT_TTL_MS = 30 * 60_000;
const DEFAULT_LOCK_TIMEOUT_MS = 120_000;

/** "90", "90s", "30m", "2h" -> milliseconds. */
export function parseDuration(value: string, setting: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h)?\s*$/i.exec(value);
  if (!m) throw new Error(`${setting} must be a duration like 90, 90s, 30m or 2h (got "${value}").`);
  const unit = (m[2] || 's').toLowerCase();
  return Math.round(Number(m[1]) * { ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[unit]!);
}

/**
 * The current run's id. Playwright starts workers from the test runner, so
 * they share its pid as their parent; XSPEC_RUN_ID overrides (e.g. in CI, or
 * to share sessions between runs on purpose).
 */
export function currentRunId(env: Env = process.env): string {
  return env.XSPEC_RUN_ID?.trim() || `ppid-${process.ppid}`;
}

export function sessionStoreSettings(env: Env = process.env): SessionStoreSettings {
  const scope = (env.UI_SESSION_SCOPE || 'run').trim().toLowerCase();
  if (scope !== 'run' && scope !== 'persistent') {
    throw new Error(`UI_SESSION_SCOPE must be "run" or "persistent" (got "${env.UI_SESSION_SCOPE}").`);
  }
  return {
    dir: path.resolve(env.UI_SESSION_DIR || DEFAULT_SESSION_DIR),
    ttlMs: env.UI_SESSION_TTL ? parseDuration(env.UI_SESSION_TTL, 'UI_SESSION_TTL') : DEFAULT_TTL_MS,
    scope,
    runId: currentRunId(env),
    lockTimeoutMs: env.UI_SESSION_LOCK_TIMEOUT
      ? parseDuration(env.UI_SESSION_LOCK_TIMEOUT, 'UI_SESSION_LOCK_TIMEOUT')
      : DEFAULT_LOCK_TIMEOUT_MS,
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'role';
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class SessionStore {
  constructor(readonly settings: SessionStoreSettings) {}

  static fromEnv(env: Env = process.env): SessionStore {
    return new SessionStore(sessionStoreSettings(env));
  }

  /** The file for a session key: readable role name plus a hash of the rest. */
  fileFor(key: SessionKey): string {
    const hash = createHash('sha256')
      .update([key.role.toLowerCase(), key.username, key.loginPath, key.app].join('\u0000'))
      .digest('hex')
      .slice(0, 16);
    return path.join(this.settings.dir, `${slug(key.role)}-${hash}.json`);
  }

  /** A saved session that is still usable (same run when scope is "run", within the TTL), or undefined. */
  read(key: SessionKey, now = Date.now()): SavedSession | undefined {
    let saved: SavedSession;
    try {
      saved = JSON.parse(fs.readFileSync(this.fileFor(key), 'utf8'));
    } catch {
      return undefined;
    }
    if (saved?.version !== 1 || !saved.state) return undefined;
    if (saved.username !== key.username) return undefined;
    if (this.settings.scope === 'run' && saved.runId !== this.settings.runId) return undefined;
    if (now - saved.savedAt > this.settings.ttlMs) return undefined;
    return saved;
  }

  write(key: SessionKey, state: UiSessionState, now = Date.now()): SavedSession {
    const saved: SavedSession = { version: 1, role: key.role, username: key.username, runId: this.settings.runId, savedAt: now, state };
    writeSecretFile(this.fileFor(key), JSON.stringify(saved));
    return saved;
  }

  /** Forget one role's session, or every saved session. */
  clear(key?: SessionKey): void {
    if (key) {
      fs.rmSync(this.fileFor(key), { force: true });
      return;
    }
    if (!fs.existsSync(this.settings.dir)) return;
    for (const f of fs.readdirSync(this.settings.dir)) {
      if (f.endsWith('.json')) fs.rmSync(path.join(this.settings.dir, f), { force: true });
    }
  }

  /**
   * Run `fn` holding the key's lock, so only one worker at a time logs in as
   * the role. `fn` should re-check `read()` first: another worker may have
   * saved the session while this one waited.
   */
  async withLock<T>(key: SessionKey, fn: () => Promise<T>, { pollMs = 100 }: { pollMs?: number } = {}): Promise<T> {
    const lock = `${this.fileFor(key)}.lock`;
    fs.mkdirSync(this.settings.dir, { recursive: true, mode: 0o700 });
    for (;;) {
      try {
        fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: 'wx', mode: 0o600 });
        break;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        if (this.abandoned(lock)) fs.rmSync(lock, { force: true });
        else await sleep(pollMs);
      }
    }
    try {
      return await fn();
    } finally {
      fs.rmSync(lock, { force: true });
    }
  }

  private abandoned(lock: string): boolean {
    try {
      const { pid, at } = JSON.parse(fs.readFileSync(lock, 'utf8'));
      if (typeof pid === 'number' && pid !== process.pid && !pidAlive(pid)) return true;
      return Date.now() - Number(at) > this.settings.lockTimeoutMs;
    } catch {
      // Unreadable: probably being written right now. Treat it as abandoned only once it's old.
      try {
        return Date.now() - fs.statSync(lock).mtimeMs > this.settings.lockTimeoutMs;
      } catch {
        return false;
      }
    }
  }
}
