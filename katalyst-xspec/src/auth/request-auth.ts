import type { ApiMethod, ApiPort, ApiResult } from '../ports/api.port';
import type { World } from '../world';

type Headers = Record<string, string>;

const headerKey = (headers: Headers | undefined, name: string) => Object.keys(headers || {}).find((k) => k.toLowerCase() === name);

/**
 * Send an API request with the scenario's headers and per-request auth
 * (world.apiAuth: refreshed OIDC tokens, DPoP proofs), retrying once when the
 * server asks for a new DPoP nonce.
 */
export async function sendAuthenticated(api: ApiPort, world: World, method: ApiMethod, path: string, body?: unknown): Promise<ApiResult> {
  const auth = world.apiAuth;
  const headersFor = async () => (auth ? { ...world.headers, ...(await auth.headers(method, path)) } : world.headers);
  let result = await api.sendJson(method, path, body, await headersFor());
  if (auth?.afterResponse?.(path, result.status, result.headers)) {
    result = await api.sendJson(method, path, body, await headersFor());
    auth.afterResponse(path, result.status, result.headers);
  }
  return result;
}

/**
 * Wrap an ApiPort so requests that carry the scenario's login token get
 * per-request auth: the token is refreshed if needed and a DPoP proof is
 * added. Custom steps can then keep calling `api.sendJson(..., world.headers)`.
 * Requests without that token (no auth, or another token) are sent as given.
 */
export function withApiRequestAuth<T extends ApiPort>(api: T, getWorld: () => World | undefined): T {
  async function send(method: string, path: string, headers: Headers | undefined, call: (h: Headers | undefined) => Promise<ApiResult>) {
    const auth = getWorld()?.apiAuth;
    const authKey = headerKey(headers, 'authorization');
    if (!auth?.matches || !authKey || !auth.matches(headers![authKey]) || headerKey(headers, 'dpop')) return call(headers);
    const rest = { ...headers };
    delete rest[authKey];
    const withAuth = async () => ({ ...rest, ...(await auth.headers(method, path)) });
    let result = await call(await withAuth());
    if (auth.afterResponse?.(path, result.status, result.headers)) {
      result = await call(await withAuth());
      auth.afterResponse(path, result.status, result.headers);
    }
    return result;
  }

  return new Proxy(api, {
    get(target, prop, receiver) {
      if (prop === 'sendJson') {
        return (method: ApiMethod, path: string, body?: unknown, headers?: Headers) =>
          send(method, path, headers, (h) => target.sendJson(method, path, body, h));
      }
      if (prop === 'sendForm') {
        return (method: 'POST' | 'PUT' | 'PATCH', path: string, form: Record<string, string>, headers?: Headers) =>
          send(method, path, headers, (h) => target.sendForm(method, path, form, h));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
