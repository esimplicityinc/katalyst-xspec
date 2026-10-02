import { registerApiHttpSteps } from './api.http';
import { registerApiAssertionSteps } from './api.assertion';
import { registerApiAuthSteps } from './api.auth';
import { registerHybridSteps } from './hybrid';
import { registerSharedCleanupSteps } from './shared.cleanup';
import { registerSharedVarSteps } from './shared.vars';
import { registerFlagSteps } from './shared.flags';
import { registerUiBasicSteps } from './ui.basic';
import { registerWizardSteps } from './ui.wizard';
import { registerFormSteps } from './ui.form';
import { registerDebugSteps } from './ui.debug';
import { registerLayoutSteps } from './ui.layout';
import { registerUiAuthSteps } from './ui.auth';
import { registerTuiBasicSteps } from './tui.basic';
import { registerTuiWizardSteps } from './tui.wizard';

/**
 * Register all API step definitions.
 * Steps are tagged with @api or @hybrid for selective execution.
 */
export function registerApiSteps(test: any): void {
  registerApiAuthSteps(test);
  registerApiHttpSteps(test);
  registerApiAssertionSteps(test);
}

/**
 * Register all UI step definitions.
 * Steps are tagged with @ui or @hybrid for selective execution.
 *
 * Includes:
 * - Basic UI steps (navigation, clicks, fills)
 * - Wizard steps (advanced interactions, locators, assertions)
 * - Form steps (bulk form filling)
 * - Debug steps (debugging utilities)
 * - Layout steps (panel, split view, responsive assertions)
 * - Auth steps (fetch interception auth)
 */
export function registerUiSteps(test: any): void {
  registerUiBasicSteps(test);
  registerWizardSteps(test);
  registerFormSteps(test);
  registerDebugSteps(test);
  registerLayoutSteps(test);
  registerUiAuthSteps(test);
}

/**
 * Register shared step definitions (used by all test types).
 *
 * Includes:
 * - Variable management steps
 * - Cleanup steps
 * - Feature flag steps
 */
export function registerSharedSteps(test: any): void {
  registerSharedVarSteps(test);
  registerSharedCleanupSteps(test);
  registerFlagSteps(test);
}

/**
 * Register hybrid step definitions.
 * Steps that work with both API and UI in the same scenario.
 */
export function registerHybridSuite(test: any): void {
  registerHybridSteps(test);
}

/**
 * Register all TUI (Terminal User Interface) step definitions.
 * Steps are tagged with @tui for selective execution.
 *
 * @example
 * ```typescript
 * import { createBddTest, registerTuiSteps, TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';
 *
 * const test = createBddTest({
 *   createTui: () => new TuiTesterAdapter({
 *     command: ['node', 'dist/cli.js'],
 *   }),
 * });
 *
 * registerTuiSteps(test);
 * ```
 */
export function registerTuiSteps(test: any): void {
  registerTuiBasicSteps(test);
  registerTuiWizardSteps(test);
}

/**
 * Register all step definitions for a full-featured test suite.
 * This is a convenience function that registers API, UI, TUI, Shared, and Hybrid steps.
 *
 * Note: TUI steps require the optional `tui-tester` peer dependency.
 *
 * @example
 * ```typescript
 * import { createBddTest, registerAllSteps } from '@esimplicitylabs/katalyst-xspec';
 *
 * const test = createBddTest({ ... });
 * registerAllSteps(test);
 * ```
 */
export function registerAllSteps(test: any): void {
  registerApiSteps(test);
  registerUiSteps(test);
  registerTuiSteps(test);
  registerSharedSteps(test);
  registerHybridSuite(test);
}

// Export individual registration functions for granular control
export {
  // API
  registerApiHttpSteps,
  registerApiAssertionSteps,
  registerApiAuthSteps,
  // UI
  registerUiBasicSteps,
  registerWizardSteps,
  registerFormSteps,
  registerDebugSteps,
  registerLayoutSteps,
  registerUiAuthSteps,
  // Shared
  registerSharedCleanupSteps,
  registerSharedVarSteps,
  registerFlagSteps,
  // Hybrid
  registerHybridSteps,
  // TUI
  registerTuiBasicSteps,
  registerTuiWizardSteps,
};

// Export flag utilities
export { isFlagEnabled, setFlag } from './shared.flags';
