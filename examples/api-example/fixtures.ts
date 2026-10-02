import { createBddTest, PlaywrightApiAdapter } from '@esimplicitylabs/katalyst-xspec';
import { registerApiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

// Create test fixtures with API adapter
export const { test, expect } = createBddTest({
  createApi: (request) => new PlaywrightApiAdapter(request, {
    baseUrl: process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com',
  }),
});

// Register step definitions
export function registerSteps(Given: any, When: any, Then: any) {
  registerApiSteps(Given, When, Then);
  registerSharedSteps(Given, When, Then);
}
