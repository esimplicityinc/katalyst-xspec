/**
 * One-time code settings by role.
 *
 * "pm" reads AUTH_PM_OTP_SECRET, plus optional AUTH_PM_OTP_ENCODING / _DIGITS /
 * _PERIOD / _ALGORITHM. AUTH_OTP_* set the same things for every role. Roles
 * passed in code (UniversalAuthAdapter `roles: { pm: { otp } }`) take precedence.
 */
import { MissingCredentialsError, roleEnvPrefix, type OtpProvider, type RoleCredentials } from './credentials';
import { generateTotp, parseOtpauthUri, totpTimeStep, type TotpAlgorithm, type TotpOptions, type TotpSecretEncoding } from './totp';

type Env = Record<string, string | undefined>;

const FIELDS = ['secret', 'encoding', 'digits', 'period', 'algorithm'] as const;
type Field = (typeof FIELDS)[number];

export function otpEnvKeys(role: string): Record<Field, string> {
  const prefix = `${roleEnvPrefix(role)}_OTP`;
  return Object.fromEntries(FIELDS.map((f) => [f, `${prefix}_${f.toUpperCase()}`])) as Record<Field, string>;
}

const GLOBAL_KEYS = Object.fromEntries(FIELDS.map((f) => [f, `AUTH_OTP_${f.toUpperCase()}`])) as Record<Field, string>;

function positiveInt(value: string, key: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${key} must be a positive whole number (got "${value}").`);
  return n;
}

/** The role's TOTP settings, or undefined if it has no secret. */
export function resolveOtpSettings(
  role: string,
  { env = process.env, roles }: { env?: Env; roles?: RoleCredentials } = {},
): TotpOptions | undefined {
  const fromCode = roles && Object.entries(roles).find(([name]) => name.toLowerCase() === role.toLowerCase())?.[1]?.otp;
  const keys = otpEnvKeys(role);
  const setting = (f: Field): [string, string] | undefined => {
    for (const key of [keys[f], GLOBAL_KEYS[f]]) if (env[key]) return [env[key]!, key];
    return undefined;
  };

  const settings: TotpOptions = { secret: '' };
  const encoding = setting('encoding');
  const digits = setting('digits');
  const period = setting('period');
  const algorithm = setting('algorithm');
  if (encoding) settings.encoding = encoding[0].trim().toLowerCase() as TotpSecretEncoding;
  if (digits) settings.digits = positiveInt(digits[0], digits[1]);
  if (period) settings.period = positiveInt(period[0], period[1]);
  if (algorithm) settings.algorithm = algorithm[0].trim() as TotpAlgorithm;

  if (typeof fromCode === 'function') return undefined;
  if (fromCode) return { ...settings, ...(typeof fromCode === 'string' ? { secret: fromCode } : fromCode) };
  const secret = setting('secret');
  if (!secret) return undefined;
  return { ...settings, secret: secret[0] };
}

/** Where a role's one-time codes come from. */
export type OtpSource =
  | { kind: 'totp'; settings: TotpOptions }
  | { kind: 'email'; to?: string; subject?: string }
  | { kind: 'custom'; provide: OtpProvider };

/** Settings for one-time codes sent by email: AUTH_<ROLE>_OTP_SOURCE=email, _OTP_EMAIL, _OTP_EMAIL_SUBJECT. */
export function otpSourceEnvKeys(role: string): { source: string; email: string; subject: string } {
  const prefix = `${roleEnvPrefix(role)}_OTP`;
  return { source: `${prefix}_SOURCE`, email: `${prefix}_EMAIL`, subject: `${prefix}_EMAIL_SUBJECT` };
}

/**
 * The role's one-time code source: a function passed in code, email
 * (AUTH_<ROLE>_OTP_SOURCE=email, or AUTH_OTP_SOURCE for every role), or TOTP
 * (the default, when the role has a secret). Undefined if none is set up.
 */
export function resolveOtpSource(
  role: string,
  { env = process.env, roles }: { env?: Env; roles?: RoleCredentials } = {},
): OtpSource | undefined {
  const fromCode = roles && Object.entries(roles).find(([name]) => name.toLowerCase() === role.toLowerCase())?.[1]?.otp;
  if (typeof fromCode === 'function') return { kind: 'custom', provide: fromCode };
  const keys = otpSourceEnvKeys(role);
  const raw = env[keys.source] || env.AUTH_OTP_SOURCE;
  const source = (raw || 'totp').trim().toLowerCase();
  if (source === 'email') {
    return { kind: 'email', to: env[keys.email] || undefined, subject: env[keys.subject] || env.AUTH_OTP_EMAIL_SUBJECT || undefined };
  }
  if (source !== 'totp') throw new Error(`${env[keys.source] ? keys.source : 'AUTH_OTP_SOURCE'} must be "totp" or "email" (got "${raw}").`);
  const settings = resolveOtpSettings(role, { env, roles });
  return settings ? { kind: 'totp', settings } : undefined;
}

/** The role's current one-time code. Throws MissingCredentialsError naming the variables to set. */
export function oneTimeCode(
  role: string,
  { env = process.env, roles, timestamp }: { env?: Env; roles?: RoleCredentials; timestamp?: number } = {},
): string {
  const settings = resolveOtpSettings(role, { env, roles });
  const keys = otpEnvKeys(role);
  if (!settings) {
    throw new MissingCredentialsError(
      `No one-time code secret for role "${role}". Set ${keys.secret} in .env (or ${GLOBAL_KEYS.secret} for every role), ` +
        `set ${otpSourceEnvKeys(role).source}=email for codes sent by email, ` +
        `or pass roles: { '${role}': { otp: { secret } } } to UniversalAuthAdapter.`,
    );
  }
  try {
    return generateTotp({ ...settings, timestamp });
  } catch (err) {
    throw new Error(
      `One-time code for role "${role}": ${(err as Error).message} ` +
        `Check ${keys.secret} and ${keys.encoding} / ${keys.digits} / ${keys.period} / ${keys.algorithm} (or the AUTH_OTP_* defaults).`,
    );
  }
}

// Time window last used per role and secret, in this process: a provider accepts each code once.
const lastUsedWindow = new Map<string, number>();

/**
 * The role's one-time code for a login: never the same code twice. If this
 * process already used the current window's code, waits for the next window.
 */
export async function freshOneTimeCode(
  role: string,
  {
    env = process.env,
    roles,
    now = Date.now,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  }: { env?: Env; roles?: RoleCredentials; now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<string> {
  const settings = resolveOtpSettings(role, { env, roles });
  const fromUri = settings?.secret.trim().toLowerCase().startsWith('otpauth://') ? parseOtpauthUri(settings.secret.trim()) : undefined;
  const period = settings?.period ?? fromUri?.period ?? 30;
  const key = `${role.toLowerCase()}\u0000${settings?.secret ?? ''}`;
  let window = totpTimeStep({ period, timestamp: now() });
  if (lastUsedWindow.get(key) === window) {
    await sleep((window + 1) * period * 1000 - now() + 50);
    window = totpTimeStep({ period, timestamp: now() });
  }
  const code = oneTimeCode(role, { env, roles, timestamp: now() });
  lastUsedWindow.set(key, window);
  return code;
}
