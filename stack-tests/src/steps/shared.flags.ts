/**
 * Feature Flag Step Definitions
 *
 * Steps for managing feature flags in tests.
 * These steps store flag state in the world object for use in other steps.
 */

import { createBdd } from 'playwright-bdd';

/** In-memory feature flag storage (per-test isolation via world) */
const globalFlags: Record<string, boolean> = {};

/**
 * Check if a feature flag is enabled.
 * Can be used by other steps for conditional logic.
 */
export function isFlagEnabled(world: any, flagName: string): boolean {
  // Check world-level flags first, then global
  const worldFlags = (world._featureFlags || {}) as Record<string, boolean>;
  if (flagName in worldFlags) {
    return worldFlags[flagName];
  }
  return globalFlags[flagName] ?? false;
}

/**
 * Set a feature flag value.
 * Can be used programmatically by other steps or adapters.
 */
export function setFlag(world: any, flagName: string, enabled: boolean): void {
  if (!world._featureFlags) {
    world._featureFlags = {};
  }
  world._featureFlags[flagName] = enabled;
  world.vars[`flag_${flagName}`] = String(enabled);
}

export function registerFlagSteps(test: any): void {
  const { Given, Then } = createBdd(test as any) as any;

  /**
   * Enable a feature flag for this test.
   *
   * @example
   * Given the feature flag "DARK_MODE" is enabled
   */
  Given(
    'the feature flag {string} is enabled',
    async ({ world }: any, flagName: string) => {
      setFlag(world, flagName, true);
      console.log(`[BDD] Feature flag "${flagName}" enabled`);
    }
  );

  /**
   * Disable a feature flag for this test.
   *
   * @example
   * Given the feature flag "DARK_MODE" is disabled
   */
  Given(
    'the feature flag {string} is disabled',
    async ({ world }: any, flagName: string) => {
      setFlag(world, flagName, false);
      console.log(`[BDD] Feature flag "${flagName}" disabled`);
    }
  );

  /**
   * Set a feature flag to a specific value.
   *
   * @example
   * Given the feature flag "BETA_FEATURES" is set to "true"
   */
  Given(
    'the feature flag {string} is set to {string}',
    async ({ world }: any, flagName: string, value: string) => {
      const enabled = value.toLowerCase() === 'true' || value === '1';
      setFlag(world, flagName, enabled);
      console.log(`[BDD] Feature flag "${flagName}" set to ${enabled}`);
    }
  );

  /**
   * Enable multiple feature flags at once.
   *
   * @example
   * Given the following feature flags are enabled:
   *   | flag           |
   *   | DARK_MODE      |
   *   | BETA_FEATURES  |
   */
  Given(
    'the following feature flags are enabled:',
    async ({ world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1) || [];

      for (const row of rows) {
        const flagName = row.flag || row[0];
        setFlag(world, flagName, true);
        console.log(`[BDD] Feature flag "${flagName}" enabled`);
      }
    }
  );

  /**
   * Disable multiple feature flags at once.
   *
   * @example
   * Given the following feature flags are disabled:
   *   | flag           |
   *   | LEGACY_MODE    |
   *   | DEBUG_LOGGING  |
   */
  Given(
    'the following feature flags are disabled:',
    async ({ world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1) || [];

      for (const row of rows) {
        const flagName = row.flag || row[0];
        setFlag(world, flagName, false);
        console.log(`[BDD] Feature flag "${flagName}" disabled`);
      }
    }
  );

  /**
   * Assert that a feature flag has a specific state.
   *
   * @example
   * Then the feature flag "DARK_MODE" should be enabled
   */
  Then(
    'the feature flag {string} should be enabled',
    async ({ world }: any, flagName: string) => {
      const enabled = isFlagEnabled(world, flagName);
      if (!enabled) {
        throw new Error(`Expected feature flag "${flagName}" to be enabled, but it was disabled`);
      }
    }
  );

  /**
   * Assert that a feature flag is disabled.
   *
   * @example
   * Then the feature flag "LEGACY_MODE" should be disabled
   */
  Then(
    'the feature flag {string} should be disabled',
    async ({ world }: any, flagName: string) => {
      const enabled = isFlagEnabled(world, flagName);
      if (enabled) {
        throw new Error(`Expected feature flag "${flagName}" to be disabled, but it was enabled`);
      }
    }
  );

  /**
   * Log all feature flags for debugging.
   *
   * @example
   * Then I log all feature flags
   */
  Then(
    'I log all feature flags',
    async ({ world }: any) => {
      const worldFlags = (world._featureFlags || {}) as Record<string, boolean>;
      console.log('[DEBUG] Feature flags:');
      for (const [name, enabled] of Object.entries(worldFlags)) {
        console.log(`  - ${name}: ${enabled ? 'enabled' : 'disabled'}`);
      }
      if (Object.keys(worldFlags).length === 0) {
        console.log('  (no flags set)');
      }
    }
  );
}
