import type { APIResponse } from '@playwright/test';

export type ApiResult = {
  status: number;
  text: string;
  json?: unknown;
  headers: Record<string, string>;
  contentType?: string;
  response: APIResponse;
};

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiPort {
  sendJson(method: ApiMethod, path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResult>;
  sendForm(method: 'POST' | 'PUT' | 'PATCH', path: string, form: Record<string, string>, headers?: Record<string, string>): Promise<ApiResult>;
}
