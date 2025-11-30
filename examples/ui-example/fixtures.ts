import { createBddTest, PlaywrightUiAdapter } from '@kata/stack-tests';
import { registerUiSteps, registerSharedSteps } from '@kata/stack-tests/steps';

// Create test fixtures with UI adapter
export const { test, expect } = createBddTest({
  createUi: (page) => new PlaywrightUiAdapter(page, {
    baseUrl: process.env.UI_BASE_URL || 'https://the-internet.herokuapp.com',
  }),
});

// Register step definitions
export function registerSteps(Given: any, When: any, Then: any) {
  registerUiSteps(Given, When, Then);
  registerSharedSteps(Given, When, Then);
}
