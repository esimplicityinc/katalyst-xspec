/**
 * Login credentials by role.
 *
 * Any role name works: "pm" reads AUTH_PM_USERNAME / AUTH_PM_PASSWORD,
 * "project manager" reads AUTH_PROJECT_MANAGER_USERNAME / ..._PASSWORD.
 * Roles passed in code (UniversalAuthAdapter `roles` option) take precedence.
 * "admin" and "user" also accept the pre-0.8 DEFAULT_* / NON_ADMIN_* names.
 */
type Env = Record<string, string | undefined>;

export type Credentials = { username: string; password: string };
export type RoleCredentials = Record<string, Partial<Credentials>>;

export class MissingCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingCredentialsError';
  }
}

export function roleEnvKeys(role: string): { username: string; password: string } {
  const key = role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return { username: `AUTH_${key}_USERNAME`, password: `AUTH_${key}_PASSWORD` };
}

const LEGACY_KEYS: Record<string, { username: string[]; password: string[] }> = {
  admin: { username: ['DEFAULT_ADMIN_USERNAME', 'DEFAULT_ADMIN_EMAIL'], password: ['DEFAULT_ADMIN_PASSWORD'] },
  user: { username: ['DEFAULT_USER_USERNAME', 'NON_ADMIN_USERNAME'], password: ['DEFAULT_USER_PASSWORD', 'NON_ADMIN_PASSWORD'] },
};

export function resolveCredentials(
  role: string,
  { env = process.env, roles }: { env?: Env; roles?: RoleCredentials } = {},
): Credentials {
  const fromCode = roles && Object.entries(roles).find(([name]) => name.toLowerCase() === role.toLowerCase())?.[1];
  const keys = roleEnvKeys(role);
  const legacy = LEGACY_KEYS[role.toLowerCase()];
  const pick = (primary: string, fallbacks: string[] = []) => [primary, ...fallbacks].map((k) => env[k]).find(Boolean);

  const username = fromCode?.username || pick(keys.username, legacy?.username);
  const password = fromCode?.password || pick(keys.password, legacy?.password);
  if (username && password) return { username, password };

  const missing = !username ? 'username' : 'password';
  const alsoAccepted = legacy?.[missing]?.length ? ` (${legacy[missing].join(' or ')} also work)` : '';
  throw new MissingCredentialsError(
    `No ${missing} for role "${role}". Set ${keys[missing]} in .env${alsoAccepted}, ` +
      `or pass roles: { '${role}': { username, password } } to UniversalAuthAdapter.`,
  );
}
