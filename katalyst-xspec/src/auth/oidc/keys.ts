/** Loads the client's private key for private_key_jwt from PEM or JWK text, or a file containing either. */
import fs from 'node:fs';
import { createPrivateKey, webcrypto, type JsonWebKey, type KeyObject } from 'node:crypto';

type ImportParams = RsaHashedImportParams | EcKeyImportParams | Algorithm | RsaPssParams;

function readKeyText(value: string): string {
  const v = value.trim();
  if (v.startsWith('-----BEGIN') || v.startsWith('{')) return v;
  try {
    return fs.readFileSync(v, 'utf8').trim();
  } catch (err) {
    throw new Error(`OIDC_CLIENT_PRIVATE_KEY is neither a PEM/JWK nor a readable file (${(err as Error).message})`);
  }
}

function defaultAlg(key: KeyObject): string {
  const type = key.asymmetricKeyType;
  if (type === 'rsa') return 'RS256';
  if (type === 'rsa-pss') return 'PS256';
  if (type === 'ed25519') return 'EdDSA';
  if (type === 'ec') {
    const curve = key.asymmetricKeyDetails?.namedCurve;
    if (curve === 'prime256v1' || curve === 'P-256') return 'ES256';
    if (curve === 'secp384r1' || curve === 'P-384') return 'ES384';
    if (curve === 'secp521r1' || curve === 'P-521') return 'ES512';
  }
  throw new Error(`Unsupported private key type for private_key_jwt: ${type}`);
}

function importParams(alg: string): ImportParams {
  const bits = alg.slice(2);
  if (alg.startsWith('RS')) return { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${bits}` };
  if (alg.startsWith('PS')) return { name: 'RSA-PSS', hash: `SHA-${bits}` };
  if (alg.startsWith('ES')) return { name: 'ECDSA', namedCurve: { '256': 'P-256', '384': 'P-384', '512': 'P-521' }[bits] ?? 'P-256' };
  if (alg === 'EdDSA' || alg === 'Ed25519') return { name: 'Ed25519' };
  throw new Error(`Unsupported OIDC_CLIENT_SIGNING_ALG "${alg}"`);
}

export async function loadClientPrivateKey(value: string, alg?: string): Promise<{ key: CryptoKey; kid?: string; alg: string }> {
  const text = readKeyText(value);
  let keyObject: KeyObject;
  let jwk: { kid?: string; alg?: string } | undefined;
  try {
    if (text.startsWith('{')) {
      jwk = JSON.parse(text);
      keyObject = createPrivateKey({ key: jwk as JsonWebKey, format: 'jwk' });
    } else {
      keyObject = createPrivateKey(text);
    }
  } catch (err) {
    throw new Error(`OIDC_CLIENT_PRIVATE_KEY could not be read as a private key: ${(err as Error).message}`);
  }
  const resolvedAlg = alg || jwk?.alg || defaultAlg(keyObject);
  const der = keyObject.export({ format: 'der', type: 'pkcs8' });
  const key = await webcrypto.subtle.importKey('pkcs8', der, importParams(resolvedAlg), false, ['sign']);
  return { key: key as CryptoKey, kid: jwk?.kid, alg: resolvedAlg };
}
