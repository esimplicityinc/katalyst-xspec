import { createBdd } from 'playwright-bdd';
import type { ApiMethod, ApiPort } from '../ports/api.port';
import type { World } from '../world';
import { interpolate, tryParseJson } from '../utils';

export function registerApiHttpSteps(test: any): void {
  const { When } = createBdd(test as any) as any;

  async function send(
    args: { api: ApiPort; world: World },
    method: ApiMethod,
    pathTemplate: string,
    body?: unknown,
  ): Promise<void> {
    const { api, world } = args;
    const path = interpolate(pathTemplate, world.vars);
    const result = await api.sendJson(method, path, body, world.headers);
    world.lastStatus = result.status;
    world.lastText = result.text;
    world.lastJson = result.json;
    world.lastHeaders = result.headers;
    world.lastContentType = result.contentType;
    world.lastResponse = result.response;
  }

  When('I GET {string}', { tags: '@api' }, async ({ api, world }: any, path: string) => {
    await send({ api, world }, 'GET', path);
  });

  When('I DELETE {string}', { tags: '@api' }, async ({ api, world }: any, path: string) => {
    await send({ api, world }, 'DELETE', path);
  });

  When('I POST {string} with JSON body:', { tags: '@api' }, async ({ api, world }: any, path: string, docString: string) => {
    const interpolated = interpolate(docString ?? '', world.vars);
    const parsed = (tryParseJson(interpolated) ?? interpolated) as unknown;
    await send({ api, world }, 'POST', path, parsed);
  });

  When('I PATCH {string} with JSON body:', { tags: '@api' }, async ({ api, world }: any, path: string, docString: string) => {
    const interpolated = interpolate(docString ?? '', world.vars);
    const parsed = (tryParseJson(interpolated) ?? interpolated) as unknown;
    await send({ api, world }, 'PATCH', path, parsed);
  });

  When('I PUT {string} with JSON body:', { tags: '@api' }, async ({ api, world }: any, path: string, docString: string) => {
    const interpolated = interpolate(docString ?? '', world.vars);
    const parsed = (tryParseJson(interpolated) ?? interpolated) as unknown;
    await send({ api, world }, 'PUT', path, parsed);
  });
}
