import type { APIRequestContext } from '@playwright/test';
import type { ApiMethod, ApiPort, ApiResult } from '../../ports/api.port';
import { tryParseJson } from '../../utils';
import { redactError } from '../../auth/secrets';

export class PlaywrightApiAdapter implements ApiPort {
  constructor(private readonly request: APIRequestContext) {}

  async sendJson(method: ApiMethod, path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResult> {
    const opts: any = {
      headers: { Accept: 'application/json', ...(headers || {}) },
    };
    if (body !== undefined) {
      opts.data = body;
      opts.headers['Content-Type'] = 'application/json';
    }

    // Playwright's error call logs list the request headers; keep credentials out of reports.
    const resp = await this.request.fetch(path, { method, ...opts }).catch((err) => {
      throw redactError(err);
    });
    const text = await resp.text();
    const respHeaders = resp.headers();
    const contentType = respHeaders['content-type'] || '';
    const json = contentType.includes('application/json') ? tryParseJson(text) : tryParseJson(text);

    return {
      status: resp.status(),
      text,
      json,
      headers: respHeaders,
      contentType,
      response: resp,
    };
  }

  async sendForm(method: 'POST' | 'PUT' | 'PATCH', path: string, form: Record<string, string>, headers?: Record<string, string>): Promise<ApiResult> {
    const body = new URLSearchParams(form).toString();
    const resp = await this.request.fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(headers || {}),
      },
      data: body,
    }).catch((err) => {
      throw redactError(err);
    });
    const text = await resp.text();
    const respHeaders = resp.headers();
    const contentType = respHeaders['content-type'] || '';
    const json = contentType.includes('application/json') ? tryParseJson(text) : tryParseJson(text);

    return {
      status: resp.status(),
      text,
      json,
      headers: respHeaders,
      contentType,
      response: resp,
    };
  }
}
