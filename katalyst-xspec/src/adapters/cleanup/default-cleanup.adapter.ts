import type { CleanupPort } from '../../ports/cleanup.port';
import type { World } from '../../world';
import { registerCleanup } from '../../utils';

export type CleanupRule = {
  varMatch: string;
  method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  body?: unknown;
};

function looksTesty(meta: unknown): boolean {
  const s = typeof meta === 'string' ? meta : JSON.stringify(meta ?? '');
  return /__|test/i.test(s);
}

function isIdLike(value: string): boolean {
  // UUID: 123e4567-e89b-12d3-a456-426614174000
  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  // Prefixed ID (nanoid/Stripe style): org_xxx, team_xxx
  const prefixedIdPattern = /^[a-z]+_[a-zA-Z0-9_-]+$/;
  // Numeric ID: 1, 42, 99999
  const numericPattern = /^\d+$/;
  // MongoDB ObjectID: 24-char hex
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  // CUID: starts with 'c', 25+ chars
  const cuidPattern = /^c[a-z0-9]{24,}$/;
  // ULID: 26-char Crockford base32
  const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  return (
    uuidPattern.test(value) ||
    prefixedIdPattern.test(value) ||
    numericPattern.test(value) ||
    objectIdPattern.test(value) ||
    cuidPattern.test(value) ||
    ulidPattern.test(value)
  );
}

function matchVar(rule: CleanupRule, varNameLower: string): boolean {
  const m = rule.varMatch;
  if (m.startsWith('/') && m.endsWith('/') && m.length > 2) {
    const re = new RegExp(m.slice(1, -1));
    return re.test(varNameLower);
  }
  return varNameLower.includes(m.toLowerCase());
}

function loadRulesFromEnv(): CleanupRule[] {
  const raw = process.env.CLEANUP_RULES?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x && typeof x === 'object')
        .map((x: any) => ({
          varMatch: String(x.varMatch ?? ''),
          method: (x.method ? String(x.method).toUpperCase() : undefined) as any,
          path: String(x.path ?? ''),
          body: x.body,
        }))
        .filter((r) => r.varMatch && r.path);
    }
  } catch {
    // ignore invalid JSON
  }
  return [];
}

/**
 * No built-in cleanup rules. Consumers define rules via the CLEANUP_RULES env var
 * (JSON array) or by passing `rules` to the DefaultCleanupAdapter constructor.
 *
 * Example CLEANUP_RULES:
 * [{"varMatch":"user","path":"/api/users/{id}"},{"varMatch":"org","path":"/api/orgs/{id}"}]
 */
const defaultRules: CleanupRule[] = [];

export class DefaultCleanupAdapter implements CleanupPort {
  private readonly rules: CleanupRule[];
  private readonly allowHeuristic: boolean;

  constructor(input?: { rules?: CleanupRule[]; allowHeuristic?: boolean }) {
    const fromEnv = loadRulesFromEnv();
    this.rules = (input?.rules && input.rules.length ? input.rules : [...fromEnv, ...defaultRules]);
    this.allowHeuristic = input?.allowHeuristic ?? /^(1|true|yes|on)$/i.test(process.env.CLEANUP_ALLOW_ALL || '');
  }

  registerFromVar(world: World, varName: string, id: unknown, meta?: unknown): void {
    if (!id) return;

    const idStr = String(id);
    if (!isIdLike(idStr)) return;

    if (!this.allowHeuristic) {
      if (!looksTesty(meta) && !looksTesty(varName)) return;
    }

    const name = (varName || '').toLowerCase();
    const rule = this.rules.find((r) => matchVar(r, name));
    if (!rule) return;

    const path = rule.path.replace(/\{id\}/g, idStr);
    registerCleanup(world, { method: rule.method ?? 'DELETE', path, body: rule.body });
  }
}
