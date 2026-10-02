import os from 'node:os';

/**
 * Options for configuring worker resolution.
 */
export type ResolveWorkersOptions = {
  /**
   * The type of test being run.
   * When set to `'tui'`, workers is always forced to `1` (TUI tests require sequential execution).
   */
  testType?: 'api' | 'ui' | 'tui' | 'hybrid';

  /**
   * Number of workers to use in CI environments (when `CI` env var is truthy).
   * @default 1
   */
  ciWorkers?: number;

  /**
   * Default number of workers for local development.
   * Set to `undefined` (default) to let Playwright decide (50% of CPU cores).
   * Set to a number to override.
   */
  defaultWorkers?: number;
};

/**
 * Resolves the number of Playwright workers based on environment variables,
 * test type, and CI detection.
 *
 * **Environment variable:** `WORKERS`
 * - `'auto'` or unset — uses smart defaults (Playwright decides locally, 1 in CI)
 * - A positive integer (e.g. `'4'`) — uses that exact worker count
 * - `'50%'` style percentage strings are passed through as strings for Playwright
 *
 * **Precedence:**
 * 1. `testType: 'tui'` always returns `1`
 * 2. `WORKERS` env var with a valid number overrides everything else
 * 3. CI environment defaults to `ciWorkers` (default: `1`)
 * 4. Otherwise returns `defaultWorkers` (default: `undefined`, letting Playwright decide)
 *
 * @example
 * ```ts
 * import { resolveWorkers } from '@esimplicityinc/katalyst-xspec';
 *
 * export default defineConfig({
 *   workers: resolveWorkers(),
 *   projects: [
 *     { name: 'api', ...apiBdd },
 *     { name: 'tui', ...tuiBdd, workers: resolveWorkers({ testType: 'tui' }) },
 *   ],
 * });
 * ```
 */
export function resolveWorkers(options: ResolveWorkersOptions = {}): number | undefined {
  const { testType, ciWorkers = 1, defaultWorkers } = options;

  // TUI tests must always run sequentially
  if (testType === 'tui') {
    return 1;
  }

  // Check WORKERS environment variable
  const workersEnv = process.env.WORKERS?.trim();

  if (workersEnv && workersEnv.toLowerCase() !== 'auto') {
    const parsed = parseInt(workersEnv, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    // Invalid value — fall through to defaults
  }

  // CI defaults to limited workers for stability
  if (process.env.CI) {
    return ciWorkers;
  }

  return defaultWorkers;
}

/**
 * Returns the number of available CPU cores on the current machine.
 * Useful for logging or making informed decisions about worker counts.
 */
export function getCpuCount(): number {
  return os.cpus().length;
}
