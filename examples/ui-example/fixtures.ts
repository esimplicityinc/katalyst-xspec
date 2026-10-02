import { createBddTest, PlaywrightUiAdapter } from '@esimplicitylabs/katalyst-xspec';
import { registerUiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

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
