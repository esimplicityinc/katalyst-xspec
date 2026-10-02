/**
 * Options for resolving the features directory path.
 */
export type ResolveFeaturesOptions = {
  /**
   * Default path to use when `FEATURES_DIR` env var is not set.
   * @default 'features'
   */
  defaultDir?: string;
};

/**
 * Options for resolving the custom steps directory path.
 */
export type ResolveStepsOptions = {
  /**
   * Default path to use when `CUSTOM_STEPS_DIR` env var is not set.
   * @default 'features/steps'
   */
  defaultDir?: string;
};

/**
 * Resolves the path to the BDD features directory.
 *
 * **Environment variable:** `FEATURES_DIR`
 * - When set, returns the value as-is (relative or absolute)
 * - When unset, returns `defaultDir` (default: `'features'`)
 *
 * Use this in `playwright.config.ts` with `defineBddProject()` to make
 * feature file locations configurable per-environment.
 *
 * @example
 * ```ts
 * import { resolveFeatures } from '@esimplicityinc/katalyst-xspec';
 * import { defineBddProject } from 'playwright-bdd';
 *
 * const apiBdd = defineBddProject({
 *   name: 'api',
 *   features: `${resolveFeatures()}/api/**\/*.feature`,
 *   steps: `${resolveSteps()}/**\/*.ts`,
 * });
 * ```
 *
 * @example
 * ```bash
 * # Run from the layer directory (default)
 * just test-bdd-run dev
 *
 * # Override via env var (used by just recipes in multi-layer repos)
 * FEATURES_DIR=../../claims-api/tests/features just test-bdd-run dev
 * ```
 */
export function resolveFeatures(options: ResolveFeaturesOptions = {}): string {
  const { defaultDir = 'features' } = options;
  const envValue = process.env.FEATURES_DIR?.trim();

  if (envValue) {
    return envValue;
  }

  return defaultDir;
}

/**
 * Resolves the path to the custom step definitions directory.
 *
 * **Environment variable:** `CUSTOM_STEPS_DIR`
 * - When set, returns the value as-is (relative or absolute)
 * - When unset, returns `defaultDir` (default: `'features/steps'`)
 *
 * Custom steps are layer-specific Given/When/Then definitions that extend
 * the library's pre-built steps. They live alongside the feature files in
 * each test layer.
 *
 * @example
 * ```ts
 * import { resolveSteps } from '@esimplicityinc/katalyst-xspec';
 * import { defineBddProject } from 'playwright-bdd';
 *
 * const apiBdd = defineBddProject({
 *   name: 'api',
 *   features: `${resolveFeatures()}/api/**\/*.feature`,
 *   steps: `${resolveSteps()}/**\/*.ts`,
 * });
 * ```
 */
export function resolveSteps(options: ResolveStepsOptions = {}): string {
  const { defaultDir = 'features/steps' } = options;
  const envValue = process.env.CUSTOM_STEPS_DIR?.trim();

  if (envValue) {
    return envValue;
  }

  return defaultDir;
}

/**
 * Builds glob patterns for use with `defineBddProject()` based on resolved paths.
 *
 * A convenience wrapper combining `resolveFeatures()` and `resolveSteps()` into
 * the shape expected by playwright-bdd's `defineBddProject()`.
 *
 * @example
 * ```ts
 * import { resolveBddPaths } from '@esimplicityinc/katalyst-xspec';
 * import { defineBddProject } from 'playwright-bdd';
 *
 * const { features, steps } = resolveBddPaths({ tag: 'api' });
 * const apiBdd = defineBddProject({ name: 'api', features, steps });
 * ```
 */
export function resolveBddPaths(options: {
  /**
   * Test tag to scope feature file glob (e.g., 'api', 'ui').
   * Creates pattern: `{featuresDir}/{tag}/**\/*.feature`
   * If omitted, uses `{featuresDir}/**\/*.feature`
   */
  tag?: string;
  /** Options for features resolution */
  featuresOptions?: ResolveFeaturesOptions;
  /** Options for steps resolution */
  stepsOptions?: ResolveStepsOptions;
} = {}): { features: string; steps: string } {
  const { tag, featuresOptions, stepsOptions } = options;

  const featuresDir = resolveFeatures(featuresOptions);
  const stepsDir = resolveSteps(stepsOptions);

  const features = tag
    ? `${featuresDir}/${tag}/**/*.feature`
    : `${featuresDir}/**/*.feature`;

  const steps = `${stepsDir}/**/*.ts`;

  return { features, steps };
}
