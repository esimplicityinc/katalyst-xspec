/**
 * Time-based one-time passwords (TOTP, RFC 6238): the 6-digit codes from
 * authenticator apps. Built on node:crypto, so no extra dependency.
 */
import { createHmac } from 'node:crypto';

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';
export type TotpSecretEncoding = 'base32' | 'latin1' | 'ascii' | 'hex';

export type TotpOptions = {
  /** The shared secret, or a full `otpauth://totp/...` URI (from the QR code). */
  secret: string;
  /** How `secret` is written. Default `base32`, what authenticator apps show. */
  encoding?: TotpSecretEncoding;
  /** Code length. Default 6. */
  digits?: number;
  /** Seconds each code is valid for. Default 30. */
  period?: number;
  /** HMAC algorithm. Default SHA1. */
  algorithm?: TotpAlgorithm;
};

const ALGORITHMS: TotpAlgorithm[] = ['SHA1', 'SHA256', 'SHA512'];
const ENCODINGS: TotpSecretEncoding[] = ['base32', 'latin1', 'ascii', 'hex'];
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeAlgorithm(value: string): TotpAlgorithm {
  const alg = value.toUpperCase().replace(/-/g, '') as TotpAlgorithm;
  if (!ALGORITHMS.includes(alg)) throw new Error(`TOTP algorithm must be SHA1, SHA256 or SHA512 (got "${value}").`);
  return alg;
}

/** The secret's raw bytes. */
export function decodeTotpSecret(secret: string, encoding: TotpSecretEncoding = 'base32'): Buffer {
  if (!ENCODINGS.includes(encoding)) throw new Error(`TOTP secret encoding must be one of ${ENCODINGS.join(', ')} (got "${encoding}").`);
  if (!secret) throw new Error('The TOTP secret is empty.');
  if (encoding === 'latin1' || encoding === 'ascii') return Buffer.from(secret, 'latin1');
  if (encoding === 'hex') {
    const hex = secret.replace(/\s+/g, '');
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error('The TOTP secret is not valid hex.');
    return Buffer.from(hex, 'hex');
  }
  const chars = secret.replace(/[\s-]+/g, '').replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const c of chars) {
    const i = BASE32.indexOf(c);
    if (i < 0) {
      throw new Error(
        'The TOTP secret is not valid base32 (letters A-Z and digits 2-7). ' +
          'If it is plain text, set the encoding to "latin1"; if it is hex, to "hex".',
      );
    }
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (!bytes.length) throw new Error('The TOTP secret is empty.');
  return Buffer.from(bytes);
}

/** Settings from an `otpauth://totp/...` URI (the text behind an authenticator QR code). */
export function parseOtpauthUri(uri: string): TotpOptions {
  const url = new URL(uri);
  if (url.protocol !== 'otpauth:' || url.host.toLowerCase() !== 'totp') {
    throw new Error(`Only totp otpauth:// URIs are supported (got "${url.protocol}//${url.host}").`);
  }
  const p = url.searchParams;
  const secret = p.get('secret');
  if (!secret) throw new Error('The otpauth:// URI has no secret parameter.');
  const options: TotpOptions = { secret, encoding: 'base32' };
  if (p.has('digits')) options.digits = Number(p.get('digits'));
  if (p.has('period')) options.period = Number(p.get('period'));
  if (p.has('algorithm')) options.algorithm = normalizeAlgorithm(p.get('algorithm')!);
  return options;
}

function resolve(options: TotpOptions): Required<TotpOptions> {
  const fromUri = options.secret.trim().toLowerCase().startsWith('otpauth://') ? parseOtpauthUri(options.secret.trim()) : undefined;
  const pick = <K extends keyof TotpOptions>(k: K) => options[k] ?? fromUri?.[k];
  const resolved = {
    secret: fromUri?.secret ?? options.secret,
    encoding: fromUri ? 'base32' : (options.encoding ?? 'base32'),
    digits: pick('digits') ?? 6,
    period: pick('period') ?? 30,
    algorithm: normalizeAlgorithm(pick('algorithm') ?? 'SHA1'),
  } as Required<TotpOptions>;
  if (!Number.isInteger(resolved.digits) || resolved.digits < 6 || resolved.digits > 10) {
    throw new Error(`TOTP digits must be a whole number from 6 to 10 (got ${resolved.digits}).`);
  }
  if (!Number.isInteger(resolved.period) || resolved.period <= 0) {
    throw new Error(`TOTP period must be a positive whole number of seconds (got ${resolved.period}).`);
  }
  return resolved;
}

/** The number of the TOTP window `timestamp` (ms, default now) falls in. */
export function totpTimeStep({ period = 30, timestamp = Date.now() }: { period?: number; timestamp?: number } = {}): number {
  return Math.floor(timestamp / 1000 / period);
}

/** The code for `timestamp` (ms since the epoch, default now). */
export function generateTotp(options: TotpOptions & { timestamp?: number }): string {
  const { secret, encoding, digits, period, algorithm } = resolve(options);
  const key = decodeTotpSecret(secret, encoding);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(totpTimeStep({ period, timestamp: options.timestamp })));
  const hmac = createHmac(algorithm.toLowerCase(), key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}
