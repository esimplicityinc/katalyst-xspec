import { createBddTest, PlaywrightApiAdapter } from '@kata/stack-tests';
import { registerApiSteps, registerSharedSteps } from '@kata/stack-tests/steps';

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
