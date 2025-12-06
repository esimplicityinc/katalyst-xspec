import { createBddTest, TuiTesterAdapter } from '@kata/stack-tests';
import { registerTuiSteps, registerSharedSteps } from '@kata/stack-tests/steps';

// Create test fixtures with TUI adapter
export const { test, expect } = createBddTest({
  createTui: () => new TuiTesterAdapter({
    cols: parseInt(process.env.TUI_COLS || '80'),
    rows: parseInt(process.env.TUI_ROWS || '24'),
  }),
});

// Register step definitions
export function registerSteps(Given: any, When: any, Then: any) {
  registerTuiSteps(Given, When, Then);
  registerSharedSteps(Given, When, Then);
}
