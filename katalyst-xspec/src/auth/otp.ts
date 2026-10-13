/**
 * One-time code settings by role.
 *
 * "pm" reads AUTH_PM_OTP_SECRET, plus optional AUTH_PM_OTP_ENCODING / _DIGITS /
 * _PERIOD / _ALGORITHM. AUTH_OTP_* set the same things for every role. Roles
 * passed in code (UniversalAuthAdapter `roles: { pm: { otp } }`) take precedence.
 */
import { MissingCredentialsError, roleEnvPrefix, type RoleCredentials } from './credentials';
import { generateTotp, type TotpAlgorithm, type TotpOptions, type TotpSecretEncoding } from './totp';

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

  if (fromCode) return { ...settings, ...(typeof fromCode === 'string' ? { secret: fromCode } : fromCode) };
  const secret = setting('secret');
  if (!secret) return undefined;
  return { ...settings, secret: secret[0] };
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
