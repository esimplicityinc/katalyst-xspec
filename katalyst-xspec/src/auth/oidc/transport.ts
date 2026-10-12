/**
 * HTTP for openid-client through Playwright's request API, so provider calls
 * get Playwright's TLS handling, client certificates (mTLS) and proxy
 * settings instead of Node's global fetch.
 */
import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import type { OidcTlsSettings } from './settings';
import { hasClientCertificate } from './settings';

/** Same shape as openid-client's CustomFetch. */
export type OidcFetch = (url: string, init: { method?: string; headers?: unknown; body?: unknown; redirect?: string }) => Promise<Response>;

export interface OidcTransport {
  fetch: OidcFetch;
  dispose(): Promise<void>;
}

export type NewRequestContext = (options: Parameters<typeof playwrightRequest.newContext>[0]) => Promise<APIRequestContext>;

type ClientCertificate = NonNullable<NonNullable<Parameters<typeof playwrightRequest.newContext>[0]>['clientCertificates']>[number];

/** Playwright client certificate entry for an origin, or undefined when none is configured or the origin isn't https. */
export function clientCertificateFor(origin: string, tls: OidcTlsSettings): ClientCertificate | undefined {
  if (!hasClientCertificate(tls) || !origin.startsWith('https:')) return undefined;
  return tls.pfxPath
    ? { origin, pfxPath: tls.pfxPath, passphrase: tls.passphrase }
    : { origin, certPath: tls.certPath, keyPath: tls.keyPath, passphrase: tls.passphrase };
}

function headerRecord(headers: unknown): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers as [string, string][]);
  return { ...(headers as Record<string, string>) };
}

function bodyData(body: unknown): string | Buffer | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string' || Buffer.isBuffer(body)) return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  throw new Error(`Unsupported request body type for OIDC request: ${Object.prototype.toString.call(body)}`);
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * A transport with one Playwright request context per origin (each gets the
 * client certificate for that origin). Contexts keep cookies, so use a fresh
 * transport per interactive login.
 */
export function createPlaywrightTransport({
  tls,
  newContext = (options) => playwrightRequest.newContext(options),
  timeoutMs = 30_000,
}: {
  tls: OidcTlsSettings;
  newContext?: NewRequestContext;
  timeoutMs?: number;
}): OidcTransport {
  const contexts = new Map<string, Promise<APIRequestContext>>();

  const contextFor = (origin: string) => {
    let ctx = contexts.get(origin);
    if (!ctx) {
      const cert = clientCertificateFor(origin, tls);
      ctx = newContext({
        ignoreHTTPSErrors: tls.insecure,
        ...(cert ? { clientCertificates: [cert] } : {}),
      });
      contexts.set(origin, ctx);
    }
    return ctx;
  };

  return {
    async fetch(url, init) {
      const ctx = await contextFor(new URL(url).origin);
      let resp;
      try {
        resp = await ctx.fetch(url, {
          method: init.method || 'GET',
          headers: headerRecord(init.headers),
          data: bodyData(init.body),
          maxRedirects: init.redirect === 'follow' ? 20 : 0,
          timeout: timeoutMs,
        });
      } catch (err) {
        throw new Error(`OIDC request ${init.method || 'GET'} ${url} failed: ${(err as Error).message.split('\n')[0]}`);
      }
      const status = resp.status();
      const body = NULL_BODY_STATUSES.has(status) ? null : await resp.body();
      return new Response(body, {
        status,
        statusText: resp.statusText(),
        headers: resp.headersArray().map(({ name, value }) => [name, value] as [string, string]),
      });
    },
    async dispose() {
      const all = [...contexts.values()];
      contexts.clear();
      await Promise.all(all.map(async (c) => (await c).dispose().catch(() => undefined)));
    },
  };
}
