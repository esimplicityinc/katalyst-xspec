# Custom Steps Guide

How to create custom step definitions for the Katalyst BDD framework.

## Basic Step Structure

```typescript
import { Given, When, Then } from '@cucumber/cucumber';

When('I do something', async ({ world }) => {
  // Step implementation
});
```

## Step with Parameters

### String Parameter

```typescript
When('I click the {string} button', async ({ ui }, buttonName: string) => {
  await ui.clickButton(buttonName);
});
```

**Usage:**
```gherkin
When I click the "Submit" button
When I click the "Cancel" button
```

### Integer Parameter

```typescript
Then('the response status should be {int}', async ({ world }, status: number) => {
  expect(world.lastStatus).toBe(status);
});
```

**Usage:**
```gherkin
Then the response status should be 200
Then the response status should be 404
```

### Multiple Parameters

```typescript
When('I fill {string} with {string}', async ({ ui }, field: string, value: string) => {
  await ui.fillLabel(field, value);
});
```

**Usage:**
```gherkin
When I fill "Email" with "test@example.com"
```

## Step with Doc String

```typescript
When('I POST {string} with JSON body:', async ({ api, world }, path: string, docString: string) => {
  const body = JSON.parse(docString);
  const result = await api.sendJson('POST', path, body, world.headers);
  world.lastStatus = result.status;
  world.lastJson = result.json;
});
```

**Usage:**
```gherkin
When I POST "/users" with JSON body:
  """
  {
    "name": "Test User",
    "email": "test@example.com"
  }
  """
```

## Step with Data Table

```typescript
import { DataTable } from '@cucumber/cucumber';

When('I fill the form:', async ({ ui }, dataTable: DataTable) => {
  const rows = dataTable.hashes();
  // rows = [{ Field: 'Email', Value: 'test@...' }, ...]
  
  for (const row of rows) {
    await ui.fillLabel(row.Field, row.Value);
  }
});
```

**Usage:**
```gherkin
When I fill the form:
  | Field    | Value            |
  | Email    | test@example.com |
  | Password | secret123        |
```

### Data Table Methods

```typescript
// Get as array of hashes (row objects)
const rows = dataTable.hashes();
// [{ Field: 'Email', Value: '...' }, { Field: 'Password', Value: '...' }]

// Get raw 2D array
const raw = dataTable.raw();
// [['Field', 'Value'], ['Email', '...'], ['Password', '...']]

// Get rows as arrays (without header)
const rowsArray = dataTable.rows();
// [['Email', '...'], ['Password', '...']]

// Get as key-value pairs (2 column table)
const pairs = dataTable.rowsHash();
// { Email: '...', Password: '...' }
```

## Tag-Restricted Steps

```typescript
// Only available in @api scenarios
When('I make an API call', { tags: '@api' }, async ({ api }) => {
  // ...
});

// Available in @api or @hybrid
When('I GET {string}', { tags: '@api or @hybrid' }, async ({ api, world }, path) => {
  // ...
});

// Only available in @ui
When('I click something', { tags: '@ui' }, async ({ ui }) => {
  // ...
});

// Available everywhere (no tag restriction)
Given('I set variable {string} to {string}', async ({ world }, name, value) => {
  world.vars[name] = value;
});
```

## Available Fixtures

Steps receive these fixtures:

```typescript
When('my step', async (fixtures) => {
  const {
    world,      // World state object
    api,        // ApiPort adapter
    ui,         // UiPort adapter
    tui,        // TuiPort adapter (if configured)
    auth,       // AuthPort adapter
    cleanup,    // CleanupPort adapter
    page,       // Playwright Page (raw)
    apiRequest, // Playwright APIRequestContext (raw)
  } = fixtures;
});
```

## Using World State

```typescript
// Store a variable
Given('I set {string} to {string}', async ({ world }, name, value) => {
  world.vars[name] = value;
});

// Read a variable
When('I use the variable {string}', async ({ world }, name) => {
  const value = world.vars[name];
  // Use value...
});

// Store API response
When('I make request', async ({ api, world }) => {
  const result = await api.sendJson('GET', '/endpoint');
  world.lastStatus = result.status;
  world.lastJson = result.json;
  world.lastText = result.text;
  world.lastHeaders = result.headers;
});

// Set headers for subsequent requests
Given('I set auth header', async ({ world }) => {
  world.headers['Authorization'] = 'Bearer token';
});
```

## Variable Interpolation

Use the `interpolate` utility:

```typescript
import { interpolate } from '@esimplicityinc/katalyst-xspec';

When('I GET {string}', async ({ api, world }, path) => {
  // Replaces {varName} with world.vars values
  const interpolatedPath = interpolate(path, world.vars);
  await api.sendJson('GET', interpolatedPath);
});
```

## Registering Steps

### Register Individual Categories

```typescript
// steps.ts
import { test } from './fixtures';
import {
  registerApiSteps,
  registerUiSteps,
  registerTuiSteps,
  registerSharedSteps,
  registerHybridSuite,
} from '@esimplicityinc/katalyst-xspec/steps';

// Register specific categories
registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);

export { test };
```

### Register All Steps

```typescript
import { test } from './fixtures';
import { registerAllSteps } from '@esimplicityinc/katalyst-xspec/steps';

registerAllSteps(test);

export { test };
```

### Register Custom Steps

```typescript
// custom-steps.ts
import { test } from './fixtures';
import { Given, When, Then } from '@cucumber/cucumber';

// Define custom steps
When('I do my custom thing', async ({ world }) => {
  // Implementation
});

Given('I have custom setup', async ({ api }) => {
  // Implementation
});

// Import in steps.ts
export { test };
```

## Step Organization

Recommended file structure:

```
features/steps/
├── fixtures.ts           # Adapter configuration
├── steps.ts              # Main step registration
└── custom/
    ├── auth.steps.ts     # Custom auth steps
    ├── data.steps.ts     # Data setup steps
    └── verify.steps.ts   # Custom verification steps
```

## Example: Complete Custom Step File

```typescript
// features/steps/custom/reporting.steps.ts
import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

/**
 * Custom steps for report generation testing
 */

When('I generate a {string} report', { tags: '@api or @hybrid' }, 
  async ({ api, world }, reportType: string) => {
    const result = await api.sendJson('POST', '/reports/generate', {
      type: reportType,
      format: 'pdf',
    }, world.headers);
    
    world.lastStatus = result.status;
    world.lastJson = result.json;
    
    if (result.json?.reportId) {
      world.vars['reportId'] = result.json.reportId;
    }
  }
);

When('I wait for the report to complete', { tags: '@api or @hybrid' },
  async ({ api, world }) => {
    const reportId = world.vars['reportId'];
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const result = await api.sendJson('GET', `/reports/${reportId}`, undefined, world.headers);
      
      if (result.json?.status === 'completed') {
        world.vars['reportUrl'] = result.json.downloadUrl;
        return;
      }
      
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
    
    throw new Error('Report generation timed out');
  }
);

Then('the report should be downloadable', { tags: '@api or @hybrid' },
  async ({ api, world }) => {
    const reportUrl = world.vars['reportUrl'];
    expect(reportUrl).toBeDefined();
    
    const result = await api.sendJson('GET', reportUrl, undefined, world.headers);
    expect(result.status).toBe(200);
    expect(result.contentType).toContain('application/pdf');
  }
);

When('I view the report in the UI', { tags: '@ui or @hybrid' },
  async ({ ui, world }) => {
    const reportId = world.vars['reportId'];
    await ui.goto(`/reports/${reportId}`);
  }
);

Then('I should see the report preview', { tags: '@ui or @hybrid' },
  async ({ ui }) => {
    await ui.expectText('Report Preview');
    await ui.expectElementState('first', 'pdf-viewer', 'locator', 'visible');
  }
);
```

## Best Practices

1. **Keep steps focused** - Each step should do one thing
2. **Use meaningful names** - Steps should read like English
3. **Handle errors gracefully** - Provide helpful error messages
4. **Use World for state** - Don't use module-level variables
5. **Tag appropriately** - Restrict steps to relevant test types
6. **Document complex steps** - Add JSDoc comments
7. **Reuse existing steps** - Don't duplicate functionality
