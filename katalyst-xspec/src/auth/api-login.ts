/**
 * API login settings, read from environment variables so most backends work
 * without code:
 *
 *   API_AUTH_LOGIN_PATH      login endpoint                 (default /auth/login)
 *   API_AUTH_BODY            "form" or "json"               (default form)
 *   API_AUTH_USERNAME_FIELD  body field for the username    (default username)
 *   API_AUTH_PASSWORD_FIELD  body field for the password    (default password)
 *   API_AUTH_TOKEN_PATH      where the token is in the JSON (default: first of
 *                            access_token, token, accessToken, data.access_token,
 *                            data.token, data.accessToken)
 *
 * If the response has no token but succeeded and set a cookie, the session
 * cookie is kept by the request context and used for later API steps.
 */
import { selectPath } from '../utils';
import type { Credentials } from './credentials';
import { roleEnvKeys } from './credentials';

type Env = Record<string, string | undefined>;

export type ApiLoginRequest = { path: string; body: 'form' | 'json'; fields: Record<string, string> };

const DEFAULT_TOKEN_PATHS = ['access_token', 'token', 'accessToken', 'data.access_token', 'data.token', 'data.accessToken'];

export function buildApiLoginRequest(creds: Credentials, env: Env = process.env): ApiLoginRequest {
  const body = (env.API_AUTH_BODY || 'form').trim().toLowerCase();
  if (body !== 'form' && body !== 'json') {
    throw new Error(`API_AUTH_BODY must be "form" or "json" (got "${env.API_AUTH_BODY}")`);
  }
  return {
    path: env.API_AUTH_LOGIN_PATH || '/auth/login',
    body,
    fields: {
      [env.API_AUTH_USERNAME_FIELD || 'username']: creds.username,
      [env.API_AUTH_PASSWORD_FIELD || 'password']: creds.password,
    },
  };
}

export function extractToken(json: unknown, env: Env = process.env): string | undefined {
  const paths = env.API_AUTH_TOKEN_PATH ? [env.API_AUTH_TOKEN_PATH] : DEFAULT_TOKEN_PATHS;
  for (const p of paths) {
    let value: unknown;
    try {
      value = selectPath(json, p);
    } catch {
      continue;
    }
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

export function apiLoginErrorMessage({
  role,
  path,
  status,
  text,
  noToken = false,
}: {
  role: string;
  path: string;
  status: number;
  text: string;
  noToken?: boolean;
}): string {
  const keys = roleEnvKeys(role);
  const body = text.length > 300 ? `${text.slice(0, 300)}…` : text;
  const head = noToken
    ? `API login as "${role}" failed: POST ${path} returned ${status} but no token found and no session cookie was set.`
    : `API login as "${role}" failed: POST ${path} returned ${status}.`;
  const hint = noToken
    ? 'Set API_AUTH_TOKEN_PATH to where the token is in the response (e.g. data.jwt).'
    : `Check ${keys.username} / ${keys.password}, API_AUTH_LOGIN_PATH, and API_AUTH_BODY (form|json) / API_AUTH_USERNAME_FIELD / API_AUTH_PASSWORD_FIELD.`;
  return `${head}\nResponse: ${body || '(empty)'}\n${hint}`;
}
