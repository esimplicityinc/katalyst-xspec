# API Testing Example

Demonstrates REST API testing with @kata/stack-tests using JSONPlaceholder as a mock API.

## What This Example Shows

- GET requests and response validation
- POST requests with JSON bodies
- Response value assertions
- Variable storage and interpolation
- Using variables in subsequent requests

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Setup

```bash
# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env
```

## Running Tests

```bash
# Run all tests
npm test

# Run with visible browser (for debugging)
npm run test:headed

# Run with Playwright inspector
npm run test:debug
```

## Feature Files

### users.feature
Tests basic CRUD operations on the `/users` endpoint:
- Fetch single user
- List all users
- Create new user (simulated - JSONPlaceholder returns mock response)

### posts.feature
Tests the `/posts` endpoint with:
- Fetch posts for a user
- Create a new post
- Variable interpolation in requests

## Project Structure

```
api-example/
├── features/
│   ├── users.feature     # User API tests
│   └── posts.feature     # Posts API tests
├── fixtures.ts           # Test configuration
├── playwright.config.ts  # Playwright setup
├── package.json
└── .env.example
```

## Customizing

### Use Different API

Edit `.env`:

```bash
API_BASE_URL=https://your-api.example.com
```

### Add Authentication

Update `fixtures.ts`:

```typescript
import { DefaultAuthAdapter } from '@kata/stack-tests';

export const { test, expect } = createBddTest({
  createApi: (request) => new PlaywrightApiAdapter(request, {
    baseUrl: process.env.API_BASE_URL,
  }),
  createAuth: () => new DefaultAuthAdapter({
    loginPath: '/auth/login',
    adminCredentials: {
      username: process.env.DEFAULT_ADMIN_USERNAME,
      password: process.env.DEFAULT_ADMIN_PASSWORD,
    },
  }),
});
```

Then use in features:

```gherkin
@api
Scenario: Authenticated request
  Given I am authenticated as an admin via API
  When I GET "/admin/users"
  Then the response status should be 200
```

## Related Documentation

- [API Testing Guide](../../docs/guides/api-testing.md)
- [API Steps Reference](../../docs/reference/steps/api-steps.md)
