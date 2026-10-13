import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeTotpSecret, generateTotp, parseOtpauthUri, totpTimeStep } from '../auth/totp.js';
import { oneTimeCode, otpEnvKeys, resolveOtpSettings } from '../auth/otp.js';
import { MissingCredentialsError } from '../auth/credentials.js';
import { UniversalAuthAdapter } from '../adapters/auth/universal-auth.adapter.js';
import { oneTimeCodeForRole } from '../auth/login-steps.js';
import { initWorld } from '../world.js';

// RFC 6238 appendix B: 8-digit codes for the ASCII seeds below.
const SEEDS = {
  SHA1: '12345678901234567890',
  SHA256: '12345678901234567890123456789012',
  SHA512: '1234567890123456789012345678901234567890123456789012345678901234',
} as const;
const VECTORS: Array<[number, string, string, string]> = [
  [59, '94287082', '46119246', '90693936'],
  [1111111109, '07081804', '68084774', '25091201'],
  [1111111111, '14050471', '67062674', '99943326'],
  [1234567890, '89005924', '91819424', '93441116'],
  [2000000000, '69279037', '90698825', '38618901'],
  [20000000000, '65353130', '77737706', '47863826'],
];

describe('generateTotp', () => {
  it('matches the RFC 6238 test vectors for SHA1, SHA256 and SHA512', () => {
    for (const [seconds, sha1, sha256, sha512] of VECTORS) {
      const at = (algorithm: keyof typeof SEEDS) =>
        generateTotp({ secret: SEEDS[algorithm], encoding: 'latin1', algorithm, digits: 8, timestamp: seconds * 1000 });
      assert.equal(at('SHA1'), sha1, `SHA1 at ${seconds}`);
      assert.equal(at('SHA256'), sha256, `SHA256 at ${seconds}`);
      assert.equal(at('SHA512'), sha512, `SHA512 at ${seconds}`);
    }
  });

  it('defaults to a base32 secret, SHA1, 6 digits and 30-second windows', () => {
    // Base32 of "12345678901234567890".
    const code = generateTotp({ secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', timestamp: 59_000 });
    assert.equal(code, '287082');
  });

  it('keeps leading zeros', () => {
    assert.equal(generateTotp({ secret: SEEDS.SHA1, encoding: 'latin1', digits: 8, timestamp: 1111111109_000 }), '07081804');
  });

  it('accepts lowercase, spaced and padded base32, and algorithm names like "sha-256"', () => {
    const a = generateTotp({ secret: 'gezd gnbv gy3t qojq gezd gnbv gy3t qojq', timestamp: 59_000 });
    const b = generateTotp({ secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ====', timestamp: 59_000 });
    assert.equal(a, '287082');
    assert.equal(b, '287082');
    const sha256 = generateTotp({ secret: SEEDS.SHA256, encoding: 'ascii', algorithm: 'sha-256' as never, digits: 8, timestamp: 59_000 });
    assert.equal(sha256, '46119246');
  });

  it('accepts hex secrets', () => {
    const hex = Buffer.from(SEEDS.SHA1, 'latin1').toString('hex');
    assert.equal(generateTotp({ secret: hex, encoding: 'hex', digits: 8, timestamp: 59_000 }), '94287082');
  });

  it('accepts an otpauth:// URI as the secret; explicit options win', () => {
    const uri = 'otpauth://totp/App:pm%40x.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=App&digits=8&period=30&algorithm=SHA1';
    assert.equal(generateTotp({ secret: uri, timestamp: 59_000 }), '94287082');
    assert.equal(generateTotp({ secret: uri, digits: 6, timestamp: 59_000 }), '287082');
    assert.deepEqual(parseOtpauthUri(uri), { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', encoding: 'base32', digits: 8, period: 30, algorithm: 'SHA1' });
  });

  it('rejects bad input with clear errors', () => {
    assert.throws(() => generateTotp({ secret: 'not base32!' }), /not valid base32.*encoding/i);
    assert.throws(() => generateTotp({ secret: '' }), /secret is empty/i);
    assert.throws(() => generateTotp({ secret: 'abc', encoding: 'hex' }), /not valid hex/i);
    assert.throws(() => generateTotp({ secret: 'GEZDGNBV', algorithm: 'MD5' as never }), /algorithm.*SHA1, SHA256 or SHA512/);
    assert.throws(() => generateTotp({ secret: 'GEZDGNBV', digits: 3 }), /digits/);
    assert.throws(() => generateTotp({ secret: 'GEZDGNBV', period: 0 }), /period/);
    assert.throws(() => generateTotp({ secret: 'GEZDGNBV', encoding: 'utf16' as never }), /encoding/);
    assert.throws(() => parseOtpauthUri('otpauth://hotp/x?secret=GEZDGNBV&counter=1'), /only totp/i);
    assert.throws(() => parseOtpauthUri('otpauth://totp/x'), /no secret/i);
  });

  it('decodes secrets', () => {
    assert.equal(decodeTotpSecret('GEZDGNBVGY3TQOJQ', 'base32').toString('latin1'), '1234567890');
    assert.equal(decodeTotpSecret('logingov-local-otp-secret', 'latin1').toString('latin1'), 'logingov-local-otp-secret');
  });

  it('totpTimeStep gives the window number', () => {
    assert.equal(totpTimeStep({ timestamp: 59_000 }), 1);
    assert.equal(totpTimeStep({ timestamp: 60_000 }), 2);
    assert.equal(totpTimeStep({ timestamp: 60_000, period: 60 }), 1);
  });
});

describe('resolveOtpSettings', () => {
  it('reads AUTH_<ROLE>_OTP_* for any role', () => {
    const env = {
      AUTH_PROJECT_MANAGER_OTP_SECRET: 'logingov-local-otp-secret',
      AUTH_PROJECT_MANAGER_OTP_ENCODING: 'latin1',
      AUTH_PROJECT_MANAGER_OTP_DIGITS: '8',
      AUTH_PROJECT_MANAGER_OTP_PERIOD: '60',
      AUTH_PROJECT_MANAGER_OTP_ALGORITHM: 'SHA256',
    };
    assert.deepEqual(resolveOtpSettings('project manager', { env }), {
      secret: 'logingov-local-otp-secret',
      encoding: 'latin1',
      digits: 8,
      period: 60,
      algorithm: 'SHA256',
    });
    assert.deepEqual(otpEnvKeys('pm').secret, 'AUTH_PM_OTP_SECRET');
  });

  it('falls back to AUTH_OTP_* for every role', () => {
    const env = { AUTH_OTP_SECRET: 's', AUTH_OTP_ENCODING: 'latin1', AUTH_PM_OTP_DIGITS: '8' };
    assert.deepEqual(resolveOtpSettings('pm', { env }), { secret: 's', encoding: 'latin1', digits: 8 });
  });

  it('roles passed in code win, as an object or a plain secret', () => {
    const env = { AUTH_PM_OTP_SECRET: 'env', AUTH_OTP_ENCODING: 'latin1' };
    assert.deepEqual(resolveOtpSettings('PM', { env, roles: { pm: { otp: { secret: 'code', encoding: 'hex' } } } }), { secret: 'code', encoding: 'hex' });
    assert.deepEqual(resolveOtpSettings('pm', { env, roles: { pm: { otp: 'plain' } } }), { secret: 'plain', encoding: 'latin1' });
  });

  it('is undefined when the role has no OTP secret', () => {
    assert.equal(resolveOtpSettings('pm', { env: { AUTH_ADMIN_OTP_SECRET: 'x' } }), undefined);
  });

  it('names the bad setting', () => {
    assert.throws(() => resolveOtpSettings('pm', { env: { AUTH_PM_OTP_SECRET: 's', AUTH_PM_OTP_DIGITS: 'six' } }), /AUTH_PM_OTP_DIGITS/);
    assert.throws(() => resolveOtpSettings('pm', { env: { AUTH_PM_OTP_SECRET: 's', AUTH_OTP_PERIOD: '-1' } }), /AUTH_OTP_PERIOD/);
  });
});

describe('oneTimeCode', () => {
  it('generates the current code for a role', () => {
    const env = { AUTH_PM_OTP_SECRET: SEEDS.SHA1, AUTH_PM_OTP_ENCODING: 'latin1', AUTH_PM_OTP_DIGITS: '8' };
    assert.equal(oneTimeCode('pm', { env, timestamp: 59_000 }), '94287082');
  });

  it('throws a clear error naming the variables to set', () => {
    assert.throws(
      () => oneTimeCode('pm', { env: {} }),
      (err: unknown) =>
        err instanceof MissingCredentialsError && /No one-time code secret for role "pm"/.test(err.message) && /AUTH_PM_OTP_SECRET/.test(err.message),
    );
  });

  it('names the setting when the secret is malformed', () => {
    assert.throws(() => oneTimeCode('pm', { env: { AUTH_PM_OTP_SECRET: 'not base32!' } }), /AUTH_PM_OTP_SECRET.*AUTH_PM_OTP_ENCODING/s);
  });
});

describe('one-time codes through the auth adapter', () => {
  const stub = undefined as never;

  it('UniversalAuthAdapter.oneTimeCodeFor uses its env and roles', async () => {
    const auth = new UniversalAuthAdapter({
      api: stub,
      ui: stub,
      apiBaseUrl: 'http://x',
      env: { AUTH_OTP_ENCODING: 'latin1' },
      roles: { pm: { otp: 'logingov-local-otp-secret' } },
    });
    const expected = generateTotp({ secret: 'logingov-local-otp-secret', encoding: 'latin1' });
    assert.equal(await auth.oneTimeCodeFor('pm'), expected);
  });

  it('oneTimeCodeForRole interpolates the role and falls back to env for adapters without oneTimeCodeFor', async () => {
    const world = initWorld();
    world.vars.who = 'pm';
    const auth = { oneTimeCodeFor: async (role: string) => `code-for-${role}` };
    assert.equal(await oneTimeCodeForRole(auth as never, world, '{who}'), 'code-for-pm');

    process.env.AUTH_ZZTEST_OTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    try {
      assert.match(await oneTimeCodeForRole({} as never, world, 'zztest'), /^\d{6}$/);
    } finally {
      delete process.env.AUTH_ZZTEST_OTP_SECRET;
    }
  });
});
