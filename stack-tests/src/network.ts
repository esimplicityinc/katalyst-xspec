/**
 * Network target resolution for the API request context.
 *
 * macOS resolves `*.localhost` to `::1` (IPv6) first, but a local kind cluster
 * binds its ingress on `0.0.0.0` (IPv4 only), so requests to `::1` fail with
 * ECONNRESET. For plain-http `*.localhost` targets we connect to `127.0.0.1`
 * instead and send the original host as the `Host` header so host-based
 * ingress routing (Istio Gateway/VirtualService, nginx, etc.) still matches.
 *
 * Deliberately NOT rewritten:
 * - bare `localhost`: local dev servers (Vite, Node >=17) often bind `::1` only.
 * - `https:`: TLS SNI and certificate checks use the URL host, so connecting to
 *   127.0.0.1 would break verification regardless of the Host header.
 *
 * Disable entirely with `STACK_TESTS_FORCE_IPV4=false` (or `0`).
 */
export type ApiRequestTarget = {
  baseURL: string;
  extraHTTPHeaders?: Record<string, string>;
};

export function resolveApiRequestTarget(
  baseURL: string,
  env: Record<string, string | undefined> = process.env,
): ApiRequestTarget {
  const flag = env.STACK_TESTS_FORCE_IPV4?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return { baseURL };

  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    return { baseURL };
  }

  if (parsed.protocol !== 'http:' || !parsed.hostname.endsWith('.localhost')) {
    return { baseURL };
  }

  const host = parsed.host; // hostname[:port], port omitted when default
  parsed.hostname = '127.0.0.1';
  let rewritten = parsed.toString();
  // URL.toString() always emits a path; keep the caller's trailing-slash form,
  // since it changes how relative request paths resolve against baseURL.
  if (!baseURL.endsWith('/') && rewritten.endsWith('/')) rewritten = rewritten.slice(0, -1);

  return { baseURL: rewritten, extraHTTPHeaders: { Host: host } };
}
