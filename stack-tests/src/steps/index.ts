import { registerApiHttpSteps } from './api.http';
import { registerApiAssertionSteps } from './api.assertion';
import { registerApiAuthSteps } from './api.auth';
import { registerHybridSteps } from './hybrid';
import { registerSharedCleanupSteps } from './shared.cleanup';
import { registerSharedVarSteps } from './shared.vars';
import { registerUiBasicSteps } from './ui.basic';
import { registerWizardSteps } from './ui.wizard';
import { registerTuiBasicSteps } from './tui.basic';
import { registerTuiWizardSteps } from './tui.wizard';

export function registerApiSteps(test: any): void {
  registerApiAuthSteps(test);
  registerApiHttpSteps(test);
  registerApiAssertionSteps(test);
}

export function registerUiSteps(test: any): void {
  registerUiBasicSteps(test);
  registerWizardSteps(test);
}

export function registerSharedSteps(test: any): void {
  registerSharedVarSteps(test);
  registerSharedCleanupSteps(test);
}

export function registerHybridSuite(test: any): void {
  registerHybridSteps(test);
}

/**
 * Register all TUI (Terminal User Interface) step definitions.
 * Steps are tagged with @tui for selective execution.
 *
 * @example
 * ```typescript
 * import { createBddTest, registerTuiSteps, TuiTesterAdapter } from '@kata/stack-tests';
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

export {
  registerApiHttpSteps,
  registerApiAssertionSteps,
  registerApiAuthSteps,
  registerHybridSteps,
  registerSharedCleanupSteps,
  registerSharedVarSteps,
  registerUiBasicSteps,
  registerWizardSteps,
  registerTuiBasicSteps,
  registerTuiWizardSteps,
};
