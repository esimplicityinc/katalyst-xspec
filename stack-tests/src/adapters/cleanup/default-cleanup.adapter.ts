import type { CleanupPort } from '../../ports/cleanup.port';
import type { World } from '../../world';
import { registerCleanup } from '../../utils';

export type CleanupRule = {
  varMatch: string;
  method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
};

function looksTesty(meta: unknown): boolean {
  const s = typeof meta === 'string' ? meta : JSON.stringify(meta ?? '');
  return /__|run[0-9a-fA-F]{4,}|test/i.test(s);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
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
        }))
        .filter((r) => r.varMatch && r.path);
    }
  } catch {
    // ignore invalid JSON
  }
  return [];
}

const defaultRules: CleanupRule[] = [
  { varMatch: 'tool_provider', path: '/admin/tool/providers/{id}' },
  { varMatch: 'extsvc', path: '/admin/tool/external-services/{id}' },
  { varMatch: 'external_service', path: '/admin/tool/external-services/{id}' },
  { varMatch: 'workspace', path: '/admin/workspaces/{id}' },
  { varMatch: 'team', path: '/admin/teams/{id}' },
  { varMatch: 'prima_model', path: '/admin/llm/prima-models/{id}' },
  { varMatch: 'pm', path: '/admin/llm/prima-models/{id}' },
  { varMatch: 'cred', path: '/admin/llm/provider-credentials/{id}' },
  { varMatch: 'user', path: '/admin/users/{id}' },
  { varMatch: 'manager', path: '/admin/users/{id}' },
  { varMatch: 'member', path: '/admin/users/{id}' },
  { varMatch: 'creator', path: '/admin/users/{id}' },
  { varMatch: 'rule', path: '/admin/llm/guardrail-rules/{id}' },
];

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
    if (!isUuidLike(idStr)) return;

    if (!this.allowHeuristic) {
      if (!looksTesty(meta) && !looksTesty(varName)) return;
    }

    const name = (varName || '').toLowerCase();
    const rule = this.rules.find((r) => matchVar(r, name));
    if (!rule) return;

    const path = rule.path.replace(/\{id\}/g, idStr);
    registerCleanup(world, { method: rule.method ?? 'DELETE', path });
  }
}
