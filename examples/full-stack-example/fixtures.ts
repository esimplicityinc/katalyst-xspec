import {
  createBddTest,
  PlaywrightApiAdapter,
  PlaywrightUiAdapter,
  TuiTesterAdapter,
  DefaultAuthAdapter,
  DefaultCleanupAdapter,
} from '@kata/stack-tests';
import {
  registerApiSteps,
  registerUiSteps,
  registerTuiSteps,
  registerSharedSteps,
  registerHybridSteps,
} from '@kata/stack-tests/steps';

// Create test fixtures with all adapters
export const { test, expect } = createBddTest({
  // API adapter for backend testing
  createApi: (request) => new PlaywrightApiAdapter(request, {
    baseUrl: process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com',
  }),

  // UI adapter for browser testing
  createUi: (page) => new PlaywrightUiAdapter(page, {
    baseUrl: process.env.UI_BASE_URL || 'https://the-internet.herokuapp.com',
  }),

  // TUI adapter for terminal testing
  createTui: () => new TuiTesterAdapter({
    cols: parseInt(process.env.TUI_COLS || '80'),
    rows: parseInt(process.env.TUI_ROWS || '24'),
  }),

  // Auth adapter for authentication
  createAuth: () => new DefaultAuthAdapter({
    loginPath: process.env.API_AUTH_LOGIN_PATH || '/auth/login',
    adminCredentials: {
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin@example.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
    },
    userCredentials: {
      username: process.env.DEFAULT_USER_USERNAME || 'user@example.com',
      password: process.env.DEFAULT_USER_PASSWORD || 'user123',
    },
  }),

  // Cleanup adapter for test isolation
  createCleanup: () => new DefaultCleanupAdapter({
    patterns: [
      { variable: /^userId/, path: '/admin/users/{id}' },
      { variable: /^postId/, path: '/admin/posts/{id}' },
    ],
  }),
});

// Register all step definitions
export function registerSteps(Given: any, When: any, Then: any) {
  registerApiSteps(Given, When, Then);
  registerUiSteps(Given, When, Then);
  registerTuiSteps(Given, When, Then);
  registerSharedSteps(Given, When, Then);
  registerHybridSteps(Given, When, Then);
}
