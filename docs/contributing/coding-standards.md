# Coding Standards

Style guidelines and conventions for @kata/stack-tests development.

## TypeScript Guidelines

### General Principles

1. **Type Safety First**: Avoid `any` unless absolutely necessary
2. **Explicit Exports**: Export only what's needed in public API
3. **Immutability**: Prefer `readonly` and const assertions
4. **Small Functions**: Keep functions focused and testable

### Type Definitions

```typescript
// Good - explicit interface with documentation
/**
 * Configuration for API requests.
 */
export interface ApiRequestConfig {
  readonly baseUrl: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

// Avoid - inline types for complex structures
function makeRequest(config: { baseUrl: string; timeout?: number }) { }
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Interfaces | PascalCase, noun | `ApiPort`, `AuthConfig` |
| Types | PascalCase, descriptive | `HttpMethod`, `ResponseData` |
| Classes | PascalCase, noun | `PlaywrightApiAdapter` |
| Functions | camelCase, verb | `createRequest`, `validateResponse` |
| Variables | camelCase | `responseBody`, `lastStatus` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT`, `MAX_RETRIES` |
| Files | kebab-case | `api.port.ts`, `playwright-api.adapter.ts` |

### Port Interfaces

```typescript
// ports/example.port.ts

/**
 * Port interface for feature X.
 * 
 * Implementations must handle [specific requirements].
 */
export interface ExamplePort {
  /**
   * Performs action X.
   * @param input - Description of input
   * @returns Description of return value
   * @throws Error if [condition]
   */
  doSomething(input: string): Promise<Result>;
  
  /**
   * Optional method for advanced use.
   */
  advancedFeature?(options: Options): Promise<void>;
}
```

### Adapter Classes

```typescript
// adapters/example/example.adapter.ts

import type { ExamplePort } from '../../ports/example.port.js';

/**
 * Default implementation of ExamplePort using [technology].
 * 
 * @example
 * ```typescript
 * const adapter = new DefaultExampleAdapter(config);
 * await adapter.doSomething('input');
 * ```
 */
export class DefaultExampleAdapter implements ExamplePort {
  private readonly config: ExampleConfig;
  
  constructor(config: ExampleConfig) {
    this.config = config;
  }
  
  async doSomething(input: string): Promise<Result> {
    // Implementation
  }
}
```

### Step Definitions

```typescript
// steps/example.steps.ts

import { Given, When, Then } from '@cucumber/cucumber';
import type { BddWorld } from '../fixtures.js';

/**
 * Register example step definitions.
 * 
 * Steps:
 * - Given I have an example
 * - When I do something with {string}
 * - Then the result should be {string}
 */
export function registerExampleSteps(
  Given: GivenFunction,
  When: WhenFunction,
  Then: ThenFunction
): void {
  Given('I have an example', async function(this: BddWorld) {
    // Setup
  });
  
  When('I do something with {string}', async function(this: BddWorld, input: string) {
    // Action
  });
  
  Then('the result should be {string}', async function(this: BddWorld, expected: string) {
    // Assertion
  });
}
```

## Code Organization

### File Structure

```
src/
├── ports/                    # Interfaces only
│   ├── api.port.ts
│   ├── ui.port.ts
│   └── index.ts              # Re-exports all ports
├── adapters/                 # Implementations
│   ├── api/
│   │   ├── playwright-api.adapter.ts
│   │   └── index.ts
│   └── index.ts              # Re-exports all adapters
├── steps/                    # Step definitions
│   ├── api.basic.ts
│   ├── api.auth.ts
│   └── index.ts              # Register functions
├── fixtures.ts               # Playwright-BDD fixtures
└── index.ts                  # Public API exports
```

### Export Patterns

```typescript
// ports/index.ts - barrel export
export type { ApiPort } from './api.port.js';
export type { UiPort } from './ui.port.js';
export type { TuiPort } from './tui.port.js';

// adapters/api/index.ts - named exports
export { PlaywrightApiAdapter } from './playwright-api.adapter.js';
export type { ApiAdapterConfig } from './playwright-api.adapter.js';

// index.ts - public API
export type * from './ports/index.js';
export * from './adapters/index.js';
export { createBddTest } from './fixtures.js';
```

### Import Order

```typescript
// 1. Node built-ins
import path from 'node:path';
import { readFile } from 'node:fs/promises';

// 2. External packages
import { test, expect } from '@playwright/test';
import { Given, When, Then } from '@cucumber/cucumber';

// 3. Internal absolute imports
import type { ApiPort } from '../ports/api.port.js';

// 4. Relative imports
import { validateInput } from './utils.js';
```

## Error Handling

### Custom Errors

```typescript
/**
 * Error thrown when API request fails.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage
throw new ApiError('Request failed', 500, responseBody);
```

### Error Messages

```typescript
// Good - specific and actionable
throw new Error(
  `API request to ${endpoint} failed with status ${status}. ` +
  `Expected 2xx response. Check server logs for details.`
);

// Avoid - vague
throw new Error('Request failed');
```

### Async Error Handling

```typescript
// Good - proper async/await error handling
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.json();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return null; // Expected case
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## Documentation

### JSDoc Comments

```typescript
/**
 * Creates a new BDD test fixture with configured adapters.
 * 
 * @param options - Configuration options for the test fixture
 * @param options.createApi - Factory function for API adapter
 * @param options.createUi - Factory function for UI adapter
 * @returns Configured test and expect objects
 * 
 * @example
 * ```typescript
 * const { test, expect } = createBddTest({
 *   createApi: (request) => new PlaywrightApiAdapter(request),
 * });
 * ```
 * 
 * @see {@link ApiPort} for API adapter interface
 * @see {@link UiPort} for UI adapter interface
 */
export function createBddTest(options: BddTestOptions) {
  // Implementation
}
```

### Inline Comments

```typescript
// Good - explains WHY, not WHAT
// Retry on 503 because the service may be temporarily overloaded
if (status === 503 && retries < maxRetries) {
  await delay(backoffMs);
  return this.request(endpoint, { ...options, retries: retries + 1 });
}

// Avoid - explains WHAT (obvious from code)
// Check if status is 503
if (status === 503) {
```

## Testing Standards

### Test Structure

```typescript
describe('PlaywrightApiAdapter', () => {
  describe('get()', () => {
    it('should return JSON response for valid endpoint', async () => {
      // Arrange
      const adapter = new PlaywrightApiAdapter(mockRequest);
      
      // Act
      const response = await adapter.get('/users/1');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
    });
    
    it('should throw ApiError for 404 response', async () => {
      // Arrange
      const adapter = new PlaywrightApiAdapter(mockRequest);
      
      // Act & Assert
      await expect(adapter.get('/nonexistent'))
        .rejects.toThrow(ApiError);
    });
  });
});
```

### Test Naming

```typescript
// Good - describes behavior
it('should return empty array when no users exist', async () => {});
it('should throw ValidationError when email is invalid', async () => {});

// Avoid - vague or implementation-focused
it('test get users', async () => {});
it('calls the API correctly', async () => {});
```

## Linting and Formatting

### ESLint Rules

Key rules enforced:
- `@typescript-eslint/explicit-function-return-type`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unused-vars`
- `import/order`
- `prefer-const`

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Pre-commit Hooks

Husky runs on commit:
1. `npm run lint` - ESLint check
2. `npm run typecheck` - TypeScript check
3. `npm run test:affected` - Tests for changed files

## Related Guides

- [Development Setup](./development-setup.md) - Environment setup
- [Testing](./testing.md) - Writing tests
- [Adding Ports](./adding-ports.md) - Port guidelines
- [Adding Adapters](./adding-adapters.md) - Adapter guidelines
