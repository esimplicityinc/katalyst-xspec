import type { World } from '../world';

export interface CleanupPort {
  registerFromVar(world: World, varName: string, id: unknown, meta?: unknown): void;
}
