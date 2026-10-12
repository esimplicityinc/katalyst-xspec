/**
 * DPoP proofs (RFC 9449) for requests to the API under test. The token
 * endpoint proofs are made by openid-client with the same key pair; this
 * signs the per-request proofs the resource server checks.
 */
import { webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;
type KeyPair = { privateKey: CryptoKey; publicKey: CryptoKey };

const b64u = (data: ArrayBuffer | Uint8Array | string) =>
  Buffer.from(typeof data === 'string' ? Buffer.from(data) : data instanceof Uint8Array ? data : new Uint8Array(data)).toString('base64url');

function jwsAlg(key: CryptoKey): { alg: string; sign: AlgorithmIdentifier | RsaPssParams | EcdsaParams } {
  const a = key.algorithm as { name: string; namedCurve?: string; hash?: { name: string } };
  switch (a.name) {
    case 'ECDSA': {
      const bits = { 'P-256': '256', 'P-384': '384', 'P-521': '512' }[a.namedCurve as string];
      if (!bits) break;
      return { alg: `ES${bits}`, sign: { name: 'ECDSA', hash: `SHA-${bits === '512' ? '512' : bits}` } };
    }
    case 'RSASSA-PKCS1-v1_5':
      return { alg: `RS${a.hash!.name.slice(4)}`, sign: { name: a.name } };
    case 'RSA-PSS': {
      const bits = Number(a.hash!.name.slice(4));
      return { alg: `PS${bits}`, sign: { name: 'RSA-PSS', saltLength: bits / 8 } };
    }
    case 'Ed25519':
      return { alg: 'EdDSA', sign: { name: 'Ed25519' } };
  }
  throw new Error(`Unsupported DPoP key algorithm: ${JSON.stringify(a)}`);
}

async function publicJwk(key: CryptoKey): Promise<Record<string, string>> {
  const { kty, crv, x, y, n, e } = (await subtle.exportKey('jwk', key)) as Record<string, string>;
  return Object.fromEntries(Object.entries({ kty, crv, x, y, n, e }).filter(([, v]) => v !== undefined)) as Record<string, string>;
}

/** The `htu` claim: the request URL without query and fragment. */
export function dpopHtu(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

export class DpopSigner {
  private header?: Record<string, unknown>;
  private readonly nonces = new Map<string, string>();

  constructor(readonly keyPair: KeyPair) {}

  async proof(method: string, url: string, accessToken?: string): Promise<string> {
    const { alg, sign } = jwsAlg(this.keyPair.privateKey);
    this.header ??= { typ: 'dpop+jwt', alg, jwk: await publicJwk(this.keyPair.publicKey) };
    const payload: Record<string, unknown> = {
      jti: b64u(webcrypto.getRandomValues(new Uint8Array(16))),
      htm: method.toUpperCase(),
      htu: dpopHtu(url),
      iat: Math.floor(Date.now() / 1000),
    };
    if (accessToken) payload.ath = b64u(await subtle.digest('SHA-256', Buffer.from(accessToken)));
    const nonce = this.nonces.get(new URL(url).origin);
    if (nonce) payload.nonce = nonce;
    const input = `${b64u(JSON.stringify(this.header))}.${b64u(JSON.stringify(payload))}`;
    const signature = await subtle.sign(sign, this.keyPair.privateKey, Buffer.from(input));
    return `${input}.${b64u(signature)}`;
  }

  /**
   * Remember a server-issued nonce. Returns true when the response asked for a
   * (new) nonce, meaning the request should be retried once.
   */
  learnNonce(url: string, status: number, headers: Record<string, string>): boolean {
    const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const nonce = lower['dpop-nonce'];
    if (!nonce) return false;
    const origin = new URL(url).origin;
    const changed = this.nonces.get(origin) !== nonce;
    this.nonces.set(origin, nonce);
    const wantsNonce = status === 401 && /use_dpop_nonce/.test(lower['www-authenticate'] || '');
    return changed && wantsNonce;
  }
}
