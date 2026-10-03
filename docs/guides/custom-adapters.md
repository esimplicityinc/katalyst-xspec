# Custom Adapters Guide

Create custom adapters to extend or replace default implementations.

> If ports and adapters are new to you, start with [Ports and Adapters, Explained](../concepts/ports-and-adapters.md).

## Overview

Adapters implement port interfaces, allowing you to:
- Use different HTTP clients (Axios, fetch, etc.)
- Integrate with custom auth systems
- Add logging, metrics, or retry logic
- Mock responses for testing

```mermaid
classDiagram
    class ApiPort {
        <<interface>>
        +sendJson(method, path, body, headers)
        +sendForm(method, path, form, headers)
    }
    
    class PlaywrightApiAdapter {
        +sendJson()
        +sendForm()
    }
    
    class CustomApiAdapter {
        +sendJson()
        +sendForm()
    }
    
    ApiPort <|.. PlaywrightApiAdapter
    ApiPort <|.. CustomApiAdapter
```

## When to Create Custom Adapters

| Scenario | Solution |
|----------|----------|
| Different HTTP client | Custom `ApiPort` adapter |
| Custom auth flow | Custom `AuthPort` adapter |
| Custom cleanup rules | Custom `CleanupPort` adapter |
| Different browser automation | Custom `UiPort` adapter |
| Different terminal framework | Custom `TuiPort` adapter |

## Creating an API Adapter

### Implement the Interface

```typescript
// adapters/axios-api.adapter.ts
import type { ApiPort, ApiMethod, ApiResult } from '@esimplicitylabs/katalyst-xspec';
import axios, { AxiosInstance } from 'axios';

export class AxiosApiAdapter implements ApiPort {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  async sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    try {
      const response = await this.client.request({
        method,
        url: path,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      return {
        status: response.status,
        text: JSON.stringify(response.data),
        json: response.data,
        headers: response.headers as Record<string, string>,
        contentType: response.headers['content-type'],
        response: response as any, // Adapter-specific
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          text: JSON.stringify(error.response.data),
          json: error.response.data,
          headers: error.response.headers,
          contentType: error.response.headers['content-type'],
          response: error.response,
        };
      }
      throw error;
    }
  }

  async sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    const formData = new URLSearchParams(form).toString();
    
    return this.sendJson(method, path, formData, {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    });
  }
}
```

### Register the Adapter

```typescript
// features/steps/fixtures.ts
import { createBddTest } from '@esimplicitylabs/katalyst-xspec';
import { AxiosApiAdapter } from './adapters/axios-api.adapter';

export const test = createBddTest({
  createApi: () => new AxiosApiAdapter(process.env.API_BASE_URL!),
});
```

## Creating an Auth Adapter

Most apps don't need one: `UniversalAuthAdapter` logs in by role using `.env` settings. See the [Authentication guide](./authentication.md) first.

### Subclass UniversalAuthAdapter (recommended)

When only the login request or the login page differs, subclass and override `apiLogin` or `uiLogin`. Role credentials (`AUTH_<ROLE>_*` or `roles` in code), all the login steps, and UI session reuse keep working. See [Extending the login](./authentication.md#extending-the-login).

```typescript
// adapters/oauth-auth.adapter.ts
import { UniversalAuthAdapter, type Credentials, type World } from '@esimplicitylabs/katalyst-xspec';

export class OAuthAuthAdapter extends UniversalAuthAdapter {
  // OAuth password grant instead of the default form POST.
  protected async apiLogin(world: World, role: string, creds: Credentials): Promise<void> {
    const result = await this.api.sendForm('POST', '/oauth/token', {
      grant_type: 'password',
      client_id: process.env.OAUTH_CLIENT_ID!,
      username: creds.username,
      password: creds.password,
    });
    if (result.status !== 200) {
      throw new Error(`OAuth login as ${role} failed: ${result.status} ${result.text}`);
    }
    this.apiSetBearer(world, (result.json as any).access_token);
  }

  // A login page with "Email" and "Sign In".
  protected async uiLogin(world: World, role: string, creds: Credentials): Promise<void> {
    await this.ui.goto('/login');
    await this.ui.fillLabel('Email', creds.username);
    await this.ui.fillLabel('Password', creds.password);
    await this.ui.clickButton('Sign In');
    await this.ui.expectUrlContains('/dashboard');
  }
}
```

```typescript
// features/steps/fixtures.ts
export const test = createBddTest({
  createAuth: ({ api, ui }) => new OAuthAuthAdapter({ api, ui }),
});
```

### Implement AuthPort from scratch

For full control, implement `AuthPort`. Implement `apiLoginAs` and `uiLoginAs` so the role steps (`Given I am authenticated as "pm" via API`, `Given I am logged in as "pm"`) work; without them only the `admin`/`user` steps work.

```typescript
// adapters/client-credentials-auth.adapter.ts
import type { AuthPort, ApiPort, UiPort, UiLoginOptions, World } from '@esimplicitylabs/katalyst-xspec';

export class ClientCredentialsAuth implements AuthPort {
  constructor(private api: ApiPort, private ui: UiPort) {}

  async apiLoginAs(world: World, role: string): Promise<void> {
    const result = await this.api.sendForm('POST', '/oauth/token', {
      grant_type: 'client_credentials',
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!,
      scope: role,
    });
    if (result.status !== 200) throw new Error(`OAuth login failed: ${result.status}`);
    this.apiSetBearer(world, (result.json as any).access_token);
  }

  async uiLoginAs(world: World, role: string, _options?: UiLoginOptions): Promise<void> {
    await this.ui.goto(`/test-login?role=${encodeURIComponent(role)}`);
  }

  apiSetBearer(world: World, token: string): void {
    world.headers = { ...world.headers, Authorization: `Bearer ${token}` };
  }

  apiLoginAsAdmin(world: World) { return this.apiLoginAs(world, 'admin'); }
  apiLoginAsUser(world: World) { return this.apiLoginAs(world, 'user'); }
  uiLoginAsAdmin(world: World) { return this.uiLoginAs(world, 'admin'); }
  uiLoginAsUser(world: World) { return this.uiLoginAs(world, 'user'); }
}
```

### Register Auth Adapter

```typescript
import { ClientCredentialsAuth } from './adapters/client-credentials-auth.adapter';

export const test = createBddTest({
  createAuth: ({ api, ui }) => new ClientCredentialsAuth(api, ui),
});
```

`createAuth` gets a `ui` that only works once a step has requested the `ui` fixture, so API-only scenarios never start a browser. Custom steps that log in through the UI must include `ui`: `async ({ auth, ui, world }) => …`.

## Creating a Cleanup Adapter

### Custom Cleanup Rules

```typescript
// adapters/custom-cleanup.adapter.ts
import type { CleanupPort, World } from '@esimplicitylabs/katalyst-xspec';
import { registerCleanup } from '@esimplicitylabs/katalyst-xspec';

type CleanupRule = {
  varMatch: string | RegExp;
  method: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
};

export class CustomCleanupAdapter implements CleanupPort {
  private rules: CleanupRule[];

  constructor(rules: CleanupRule[]) {
    this.rules = rules;
  }

  registerFromVar(world: World, varName: string, id: unknown): void {
    const idStr = String(id);
    
    for (const rule of this.rules) {
      const matches = typeof rule.varMatch === 'string'
        ? varName.toLowerCase().includes(rule.varMatch.toLowerCase())
        : rule.varMatch.test(varName);

      if (matches) {
        const path = rule.path.replace('{id}', idStr);
        registerCleanup(world, { method: rule.method, path });
        return;
      }
    }

    console.warn(`No cleanup rule found for variable: ${varName}`);
  }
}
```

### Register Cleanup Adapter

```typescript
import { CustomCleanupAdapter } from './adapters/custom-cleanup.adapter';

export const test = createBddTest({
  createCleanup: () => new CustomCleanupAdapter([
    { varMatch: 'user', method: 'DELETE', path: '/api/users/{id}' },
    { varMatch: 'order', method: 'DELETE', path: '/api/orders/{id}' },
    { varMatch: 'product', method: 'DELETE', path: '/api/products/{id}' },
    { varMatch: /^team/, method: 'DELETE', path: '/api/teams/{id}' },
  ]),
});
```

## Adapter with Logging

### Logging Wrapper

```typescript
// adapters/logging-api.adapter.ts
import type { ApiPort, ApiMethod, ApiResult } from '@esimplicitylabs/katalyst-xspec';

export class LoggingApiAdapter implements ApiPort {
  constructor(private delegate: ApiPort) {}

  async sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    console.log(`[API] ${method} ${path}`);
    if (body) {
      console.log(`[API] Body:`, JSON.stringify(body, null, 2));
    }

    const start = Date.now();
    const result = await this.delegate.sendJson(method, path, body, headers);
    const duration = Date.now() - start;

    console.log(`[API] ${result.status} (${duration}ms)`);
    return result;
  }

  async sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    console.log(`[API] ${method} ${path} (form)`);
    
    const start = Date.now();
    const result = await this.delegate.sendForm(method, path, form, headers);
    const duration = Date.now() - start;

    console.log(`[API] ${result.status} (${duration}ms)`);
    return result;
  }
}
```

### Use Logging Wrapper

```typescript
import { PlaywrightApiAdapter } from '@esimplicitylabs/katalyst-xspec';
import { LoggingApiAdapter } from './adapters/logging-api.adapter';

export const test = createBddTest({
  createApi: ({ apiRequest }) => {
    const baseAdapter = new PlaywrightApiAdapter(apiRequest);
    return process.env.DEBUG 
      ? new LoggingApiAdapter(baseAdapter)
      : baseAdapter;
  },
});
```

## Adapter with Retry Logic

```typescript
// adapters/retry-api.adapter.ts
import type { ApiPort, ApiMethod, ApiResult } from '@esimplicitylabs/katalyst-xspec';

export class RetryApiAdapter implements ApiPort {
  constructor(
    private delegate: ApiPort,
    private maxRetries: number = 3,
    private retryDelay: number = 1000
  ) {}

  async sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.delegate.sendJson(method, path, body, headers);
        
        // Retry on server errors
        if (result.status >= 500 && attempt < this.maxRetries) {
          console.warn(`[Retry] Attempt ${attempt} failed with ${result.status}`);
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Retry] Attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  async sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    // Similar retry logic...
    return this.delegate.sendForm(method, path, form, headers);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Mock Adapter for Testing

```typescript
// adapters/mock-api.adapter.ts
import type { ApiPort, ApiMethod, ApiResult } from '@esimplicitylabs/katalyst-xspec';

type MockResponse = {
  status: number;
  json: unknown;
};

export class MockApiAdapter implements ApiPort {
  private mocks: Map<string, MockResponse> = new Map();

  mock(method: ApiMethod, path: string, response: MockResponse): void {
    this.mocks.set(`${method}:${path}`, response);
  }

  async sendJson(
    method: ApiMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    const key = `${method}:${path}`;
    const mock = this.mocks.get(key);
    
    if (!mock) {
      throw new Error(`No mock defined for ${key}`);
    }

    return {
      status: mock.status,
      text: JSON.stringify(mock.json),
      json: mock.json,
      headers: {},
      contentType: 'application/json',
      response: {} as any,
    };
  }

  async sendForm(): Promise<ApiResult> {
    throw new Error('Not implemented in mock');
  }
}
```

## Testing Your Adapter

```typescript
// adapters/__tests__/custom-api.adapter.test.ts
import { describe, it, expect } from 'vitest';
import { CustomApiAdapter } from '../custom-api.adapter';

describe('CustomApiAdapter', () => {
  it('should send JSON request', async () => {
    const adapter = new CustomApiAdapter('http://localhost:3000');
    
    const result = await adapter.sendJson('GET', '/health');
    
    expect(result.status).toBe(200);
  });

  it('should handle errors', async () => {
    const adapter = new CustomApiAdapter('http://localhost:3000');
    
    const result = await adapter.sendJson('GET', '/not-found');
    
    expect(result.status).toBe(404);
  });
});
```

## Best Practices

### Keep Adapters Focused

```typescript
// Good - single responsibility
class ApiAdapter implements ApiPort { /* HTTP only */ }
class AuthAdapter implements AuthPort { /* Auth only */ }

// Avoid - multiple responsibilities
class EverythingAdapter implements ApiPort, AuthPort, CleanupPort { }
```

### Use Composition

```typescript
// Good - compose behaviors
const api = new RetryApiAdapter(
  new LoggingApiAdapter(
    new PlaywrightApiAdapter(request)
  )
);
```

### Handle Errors Gracefully

```typescript
async sendJson(...): Promise<ApiResult> {
  try {
    // ... implementation
  } catch (error) {
    // Return error result instead of throwing
    return {
      status: 0,
      text: error.message,
      json: { error: error.message },
      headers: {},
    };
  }
}
```

## Related Topics

- [Architecture](../concepts/architecture.md) - Ports and adapters pattern
- [Adding Adapters](../contributing/adding-adapters.md) - Contributing adapters
- [Ports Reference](../reference/api/ports.md) - Port interfaces
