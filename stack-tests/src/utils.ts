import { expect } from '@playwright/test';
import type { World } from './world';

export function interpolate(template: string, vars: Record<string, string>): string {
  return String(template).replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : v;
  });
}

export function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function tokenize(path: string): Array<string | number> {
  const out: Array<string | number> = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === '.') {
      i++;
      continue;
    }
    if (path[i] === '[') {
      const j = path.indexOf(']', i + 1);
      if (j < 0) throw new Error(`Invalid path: ${path}`);
      const idxStr = path.slice(i + 1, j);
      const idx = Number(idxStr);
      if (!Number.isInteger(idx)) throw new Error(`Invalid array index '${idxStr}' in path '${path}'`);
      out.push(idx);
      i = j + 1;
      continue;
    }

    let j = i;
    while (j < path.length && /[a-zA-Z0-9_-]/.test(path[j])) j++;
    const key = path.slice(i, j);
    out.push(key);
    i = j;
  }
  return out;
}

export function selectPath(root: unknown, path: string): unknown {
  if (!path) return root;
  let cur: any = root;
  for (const token of tokenize(path)) {
    if (typeof token === 'number') {
      if (!Array.isArray(cur)) {
        const gotType = cur === null ? 'null' : Array.isArray(cur) ? 'array' : typeof cur;
        throw new Error(`Path '${path}': expected array but got ${gotType}`);
      }
      cur = cur[token];
    } else {
      if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) {
        const gotType = cur === null ? 'null' : Array.isArray(cur) ? 'array' : typeof cur;
        throw new Error(`Path '${path}': expected object but got ${gotType}`);
      }
      cur = cur[token];
    }
  }
  return cur;
}

export function parseExpected(input: string, world: World): unknown {
  const s = interpolate(input, world.vars);
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (!Number.isNaN(Number(s)) && s.trim() !== '') return Number(s);
  return s;
}

export function assertMasked(val: unknown): void {
  expect(val).toBe('****');
}

export function registerCleanup(world: World, item: { method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT'; path: string }): void {
  const method = item.method ?? 'DELETE';
  if (world.cleanup.some((c) => c.method === method && c.path === item.path)) return;
  world.cleanup.push({ method, path: item.path });
}
