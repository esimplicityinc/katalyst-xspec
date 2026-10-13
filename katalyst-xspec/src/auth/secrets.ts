/**
 * Keeping credentials out of logs, error messages and git: redaction for
 * headers and Playwright call logs, and owner-only files for saved sessions.
 */
import fs from 'node:fs';
import path from 'node:path';

type Env = Record<string, string | undefined>;

/** Where saved login sessions are written (git-ignored by `katalyst-xspec init` / `upgrade`). */
export const DEFAULT_SESSION_DIR = '.xspec/auth';

export const REDACTED = '[redacted]';

const SECRET_HEADERS = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'dpop', 'x-api-key', 'x-auth-token', 'x-csrf-token'];
const SECRET_HEADER_SET = new Set(SECRET_HEADERS);

/** XSPEC_SHOW_SECRETS=true turns redaction off (local debugging only). */
export function showSecrets(env: Env = process.env): boolean {
  return /^(1|true|yes)$/i.test(env.XSPEC_SHOW_SECRETS?.trim() ?? '');
}

export function isSecretHeader(name: string): boolean {
  return SECRET_HEADER_SET.has(name.trim().toLowerCase());
}

/** A copy of `headers` with credential-bearing values replaced. */
export function redactHeaders<T extends Record<string, string | string[] | undefined>>(headers: T, env: Env = process.env): T {
  if (showSecrets(env)) return { ...headers };
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(headers)) out[name] = isSecretHeader(name) && value !== undefined ? REDACTED : value;
  return out as T;
}

// `Authorization: Bearer x` lines in Playwright call logs (possibly wrapped in ANSI dim codes).
const HEADER_LINE = new RegExp(String.raw`(\b(?:${SECRET_HEADERS.join('|')})\s*:[ \t]*)[^\r\n\x1b]+`, 'gi');
// Credentials after an auth scheme anywhere else in the text.
const AUTH_SCHEME = /\b(Bearer|DPoP|Basic)\s+([A-Za-z0-9\-._~+/]{8,}=*)/g;
// Tokens have digits, symbols or mixed case; prose like "Basic authentication" doesn't.
const looksLikeCredential = (s: string) => /[0-9\-._~+/=]/.test(s) || /.[A-Z]/.test(s);

/** `text` with header values and bearer/DPoP/basic credentials replaced. */
export function redactSecrets(text: string, env: Env = process.env): string {
  if (showSecrets(env) || !text) return text;
  return text
    .replace(HEADER_LINE, `$1${REDACTED}`)
    .replace(AUTH_SCHEME, (match, scheme: string, value: string) => (looksLikeCredential(value) ? `${scheme} ${REDACTED}` : match));
}

/** Redact an error's message and stack in place (keeps its type) and return it. */
export function redactError<T>(err: T, env: Env = process.env): T {
  if (err instanceof Error && !showSecrets(env)) {
    err.message = redactSecrets(err.message, env);
    if (err.stack) err.stack = redactSecrets(err.stack, env);
  }
  return err;
}

/** A short stand-in for a secret value in logs: `[redacted, 52 chars]`. */
export function maskValue(value: string, env: Env = process.env): string {
  if (showSecrets(env)) return value;
  return `[redacted, ${value.length} chars]`;
}

/** localStorage/sessionStorage keys that usually hold credentials. */
export function looksSecretKey(key: string): boolean {
  return /token|auth|session|secret|password|jwt|credential|oidc|api[-_]?key/i.test(key);
}

/** Values that look like a JWT. */
export function looksLikeJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*$/.test(value.trim());
}

/**
 * Write a file only the current user can read (0600), in a directory only they
 * can open (0700). Written to a temporary file and renamed, so readers never
 * see a partial file.
 */
export function writeSecretFile(file: string, content: string): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, content, { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
