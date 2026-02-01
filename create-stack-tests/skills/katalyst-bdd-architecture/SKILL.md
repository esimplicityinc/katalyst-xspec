---
name: katalyst-bdd-architecture
description: Understand and extend the Katalyst BDD framework architecture. Use when creating custom adapters, adding new step definitions, understanding the hexagonal (ports and adapters) pattern, customizing the fixture system, or extending framework functionality.
---

# Katalyst BDD Architecture Guide

This skill explains the framework's hexagonal architecture and how to extend it.

## Architecture Overview

The framework uses **Ports and Adapters** (Hexagonal) architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     Test Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Feature Files   │  │ Step Definitions │              │
│  │ (Gherkin)       │  │ (TypeScript)     │              │
│  └────────┬────────┘  └────────┬─────────┘              │
│           │                    │                        │
│           └────────┬───────────┘                        │
│                    ▼                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Fixture System                      │   │
│  │         (createBddTest + World)                 │   │
│  └─────────────────────┬───────────────────────────┘   │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│                  Port Layer (Interfaces)                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ ApiPort │ │ UiPort  │ │ TuiPort │ │AuthPort │ ...   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
└───────┼──────────┼──────────┼──────────┼───────────────┘
        │          │          │          │
┌───────┼──────────┼──────────┼──────────┼───────────────┐
│       ▼          ▼          ▼          ▼               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │Playwright││Playwright││TuiTester│ │Universal    │   │
│  │ApiAdapter││UiAdapter ││Adapter  │ │AuthAdapter  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └─────────────┘   │
│       │          │          │     Adapter Layer        │
└───────┼──────────┼──────────┼──────────────────────────┘
        │          │          │
        ▼          ▼          ▼
   [Playwright] [Playwright] [tui-tester/tmux]
```

## Core Concepts

### Ports (Interfaces)
Ports define **what** operations are available, not **how** they work:

```typescript
// ApiPort - HTTP API operations
interface ApiPort {
  sendJson(method: ApiMethod, path: string, body?: unknown): Promise<ApiResult>;
  sendForm(method: string, path: string, form: Record<string, string>): Promise<ApiResult>;
}

// UiPort - Browser UI operations
interface UiPort {
  goto(path: string): Promise<void>;
  clickButton(name: string): Promise<void>;
  fillLabel(label: string, value: string): Promise<void>;
  expectText(text: string): Promise<void>;
  // ... more methods
}

// TuiPort - Terminal UI operations
interface TuiPort {
  start(): Promise<void>;
  typeText(text: string): Promise<void>;
  expectText(text: string): Promise<void>;
  // ... more methods
}
```

### Adapters (Implementations)
Adapters implement ports using specific technologies:

```typescript
// PlaywrightApiAdapter implements ApiPort using Playwright's APIRequestContext
class PlaywrightApiAdapter implements ApiPort {
  constructor(private request: APIRequestContext) {}
  
  async sendJson(method, path, body) {
    const response = await this.request.fetch(path, { method, data: body });
    // ... process response
  }
}

// PlaywrightUiAdapter implements UiPort using Playwright's Page
class PlaywrightUiAdapter implements UiPort {
  constructor(private page: Page) {}
  
  async goto(path) {
    await this.page.goto(path);
  }
  
  async clickButton(name) {
    await this.page.getByRole('button', { name }).click();
  }
}
```

### Benefits

1. **Testability** - Mock ports to unit test step logic
2. **Flexibility** - Swap implementations without changing tests
3. **Clarity** - Clear separation between what and how
4. **Reusability** - Same steps work with different adapters

## World State

The World object holds test state:

```typescript
type World = {
  vars: Record<string, string>;      // Test variables
  headers: Record<string, string>;   // HTTP headers for requests
  cleanup: CleanupItem[];            // Resources to clean up
  skipCleanup?: boolean;             // Whether to skip cleanup
  
  // Populated after API calls
  lastResponse?: APIResponse;
  lastStatus?: number;
  lastText?: string;
  lastJson?: unknown;
  lastHeaders?: Record<string, string>;
  lastContentType?: string;
};
```

## The Fixture System

### createBddTest Function

The core function that wires everything together:

```typescript
import { createBddTest } from '@esimplicity/stack-tests';

const test = createBddTest({
  // Optional: Override default adapters
  createApi: (ctx) => new PlaywrightApiAdapter(ctx.apiRequest),
  createUi: (ctx) => new PlaywrightUiAdapter(ctx.page),
  createAuth: (ctx) => new UniversalAuthAdapter({ api: ctx.api, ui: ctx.ui }),
  createCleanup: () => new DefaultCleanupAdapter(),
  createTui: () => new TuiTesterAdapter({ command: ['node', 'cli.js'] }),
  
  // Optional: Custom world factory
  worldFactory: () => ({
    vars: {},
    headers: {},
    cleanup: [],
  }),
});
```

### Context Available in Factories

```typescript
createApi: (ctx) => {
  ctx.apiRequest;  // Playwright APIRequestContext
  ctx.page;        // Playwright Page (for @ui)
  // Return your ApiPort implementation
}

createUi: (ctx) => {
  ctx.page;        // Playwright Page
  // Return your UiPort implementation
}

createAuth: (ctx) => {
  ctx.api;         // The created ApiPort
  ctx.ui;          // The created UiPort
  // Return your AuthPort implementation
}
```

## Creating Custom Steps

### Step Registration

```typescript
import { Given, When, Then } from '@cucumber/cucumber';

// Basic step
When('I do something with {string}', async ({ world }, param: string) => {
  world.vars['result'] = param;
});

// Step with tag restriction
When('I make API call', { tags: '@api or @hybrid' }, async ({ api, world }) => {
  const result = await api.sendJson('GET', '/endpoint');
  world.lastJson = result.json;
});

// Step with multiple fixtures
When('I verify in both layers', { tags: '@hybrid' }, async ({ api, ui, world }) => {
  await api.sendJson('POST', '/data', { value: 'test' });
  await ui.goto('/data');
  await ui.expectText('test');
});
```

### Available Fixtures in Steps

```typescript
{
  world,      // World state object
  api,        // ApiPort adapter
  ui,         // UiPort adapter
  tui,        // TuiPort adapter (if configured)
  auth,       // AuthPort adapter
  cleanup,    // CleanupPort adapter
  page,       // Playwright Page (raw access)
  apiRequest, // Playwright APIRequestContext (raw access)
}
```

### Step with Data Table

```typescript
When('I fill form with:', async ({ ui }, dataTable: DataTable) => {
  const rows = dataTable.hashes();
  for (const row of rows) {
    await ui.fillLabel(row.Field, row.Value);
  }
});
```

### Step with Doc String

```typescript
When('I send JSON:', async ({ api, world }, docString: string) => {
  const body = JSON.parse(docString);
  const result = await api.sendJson('POST', '/endpoint', body);
  world.lastJson = result.json;
});
```

## Creating Custom Adapters

### Custom API Adapter

```typescript
import { ApiPort, ApiResult, ApiMethod } from '@esimplicity/stack-tests';
import axios from 'axios';

class AxiosApiAdapter implements ApiPort {
  private client = axios.create({
    baseURL: process.env.API_BASE_URL,
  });
  
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
        headers,
      });
      
      return {
        status: response.status,
        text: JSON.stringify(response.data),
        json: response.data,
        headers: response.headers as Record<string, string>,
        contentType: response.headers['content-type'],
        response: response as any,
      };
    } catch (error: any) {
      return {
        status: error.response?.status || 500,
        text: error.message,
        json: error.response?.data,
        headers: {},
        response: error.response,
      };
    }
  }
  
  async sendForm(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    form: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<ApiResult> {
    return this.sendJson(method, path, form, {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    });
  }
}
```

### Custom Auth Adapter

```typescript
import { AuthPort, World, ApiPort, UiPort } from '@esimplicity/stack-tests';

class CustomAuthAdapter implements AuthPort {
  constructor(private deps: { api: ApiPort; ui: UiPort }) {}
  
  async apiLoginAsAdmin(world: World): Promise<void> {
    const result = await this.deps.api.sendJson('POST', '/auth/admin', {
      apiKey: process.env.ADMIN_API_KEY,
    });
    
    if (result.json?.token) {
      world.headers['Authorization'] = `Bearer ${result.json.token}`;
    }
  }
  
  async apiLoginAsUser(world: World): Promise<void> {
    const result = await this.deps.api.sendJson('POST', '/auth/login', {
      email: process.env.DEFAULT_USER_USERNAME,
      password: process.env.DEFAULT_USER_PASSWORD,
    });
    
    if (result.json?.token) {
      world.headers['Authorization'] = `Bearer ${result.json.token}`;
    }
  }
  
  async uiLoginAsAdmin(world: World): Promise<void> {
    await this.deps.ui.goto('/admin/login');
    await this.deps.ui.fillLabel('Admin Key', process.env.ADMIN_KEY!);
    await this.deps.ui.clickButton('Login');
  }
  
  async uiLoginAsUser(world: World): Promise<void> {
    await this.deps.ui.goto('/login');
    await this.deps.ui.fillLabel('Email', process.env.DEFAULT_USER_USERNAME!);
    await this.deps.ui.fillLabel('Password', process.env.DEFAULT_USER_PASSWORD!);
    await this.deps.ui.clickButton('Sign In');
  }
  
  apiSetBearer(world: World, token: string): void {
    world.headers['Authorization'] = `Bearer ${token}`;
  }
}
```

### Using Custom Adapters

```typescript
// fixtures.ts
import { createBddTest } from '@esimplicity/stack-tests';
import { AxiosApiAdapter } from './adapters/axios-api';
import { CustomAuthAdapter } from './adapters/custom-auth';

export const test = createBddTest({
  createApi: () => new AxiosApiAdapter(),
  createAuth: ({ api, ui }) => new CustomAuthAdapter({ api, ui }),
});
```

## Adding New Ports

If you need capabilities not covered by existing ports:

### 1. Define the Port Interface

```typescript
// ports/email.port.ts
export interface EmailPort {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  getInbox(address: string): Promise<Email[]>;
  waitForEmail(address: string, subject: string): Promise<Email>;
}

export interface Email {
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: Date;
}
```

### 2. Create an Adapter

```typescript
// adapters/mailhog-email.adapter.ts
import { EmailPort, Email } from '../ports/email.port';

export class MailhogEmailAdapter implements EmailPort {
  constructor(private baseUrl: string) {}
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation using Mailhog API
  }
  
  async getInbox(address: string): Promise<Email[]> {
    // Implementation
  }
  
  async waitForEmail(address: string, subject: string): Promise<Email> {
    // Implementation with polling
  }
}
```

### 3. Add to Fixtures

```typescript
// fixtures.ts
import { createBddTest } from '@esimplicity/stack-tests';
import { MailhogEmailAdapter } from './adapters/mailhog-email';

// Extend the test fixture
const baseTest = createBddTest();

export const test = baseTest.extend({
  email: async ({}, use) => {
    const adapter = new MailhogEmailAdapter(process.env.MAILHOG_URL!);
    await use(adapter);
  },
});
```

### 4. Create Steps

```typescript
// steps/email.steps.ts
import { When, Then } from '@cucumber/cucumber';

When('I send an email to {string} with subject {string}', 
  async ({ email }, to: string, subject: string) => {
    await email.sendEmail(to, subject, 'Test body');
  }
);

Then('I should receive an email at {string} with subject {string}',
  async ({ email }, address: string, subject: string) => {
    const mail = await email.waitForEmail(address, subject);
    expect(mail).toBeDefined();
  }
);
```

## Utility Functions

### Variable Interpolation

```typescript
import { interpolate } from '@esimplicity/stack-tests';

const template = 'Hello {name}, your ID is {id}';
const result = interpolate(template, { name: 'John', id: '123' });
// Result: 'Hello John, your ID is 123'
```

### JSON Path Selection

```typescript
import { selectPath } from '@esimplicity/stack-tests';

const data = { 
  user: { 
    name: 'John',
    roles: ['admin', 'user']
  }
};

selectPath(data, 'user.name');      // 'John'
selectPath(data, 'user.roles[0]');  // 'admin'
```

### Tag Helpers

```typescript
import { tagsForProject, resolveExtraTags } from '@esimplicity/stack-tests';

// Build tag expression with defaults
tagsForProject({ projectTag: '@api' });
// Result: 'not @Skip and not @ignore and @api'

// With extra tags
tagsForProject({ projectTag: '@api', extraTags: '@smoke' });
// Result: 'not @Skip and not @ignore and @api and (@smoke)'
```

## File Organization

Recommended structure for extensions:

```
features/
├── steps/
│   ├── fixtures.ts       # Main fixture configuration
│   ├── steps.ts          # Step registration
│   └── custom/
│       ├── email.steps.ts    # Custom email steps
│       └── reporting.steps.ts
├── adapters/
│   ├── custom-api.adapter.ts
│   ├── custom-auth.adapter.ts
│   └── email.adapter.ts
└── ports/
    └── email.port.ts
```

## See Also

- [API Ports Reference](references/ports.md)
- [Built-in Adapters](references/adapters.md)
- [Custom Steps Guide](references/custom-steps.md)
