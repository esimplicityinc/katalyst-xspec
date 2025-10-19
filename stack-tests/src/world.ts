import type { APIResponse } from '@playwright/test';

export type CleanupItem = {
  method: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  headers?: Record<string, string>;
};

export type World = {
  vars: Record<string, string>;
  headers: Record<string, string>;
  cleanup: CleanupItem[];
  skipCleanup?: boolean;

  lastResponse?: APIResponse;
  lastStatus?: number;
  lastText?: string;
  lastJson?: unknown;
  lastHeaders?: Record<string, string>;
  lastContentType?: string;
};

export function initWorld(): World {
  return {
    vars: {},
    headers: {},
    cleanup: [],
  };
}
