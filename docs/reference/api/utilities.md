# Utilities Reference

Helper functions exported by @kata/stack-tests.

## Variable Interpolation

### interpolate

Replaces `{varName}` placeholders with values from a variables object.

```typescript
import { interpolate } from '@kata/stack-tests';
```

#### Signature

```typescript
function interpolate(template: string, vars: Record<string, string>): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `template` | `string` | String containing `{varName}` placeholders |
| `vars` | `Record<string, string>` | Variable values |

#### Returns

String with placeholders replaced.

#### Example

```typescript
const vars = {
  userId: '123',
  email: 'test@example.com',
};

interpolate('/users/{userId}', vars);
// Result: '/users/123'

interpolate('Email: {email}', vars);
// Result: 'Email: test@example.com'

interpolate('No vars here', vars);
// Result: 'No vars here'

interpolate('Missing: {unknown}', vars);
// Result: 'Missing: {unknown}' (unchanged)
```

---

## JSON Utilities

### tryParseJson

Safely parses a JSON string, returning undefined on failure.

```typescript
import { tryParseJson } from '@kata/stack-tests';
```

#### Signature

```typescript
function tryParseJson(text: string): unknown
```

#### Example

```typescript
tryParseJson('{"key": "value"}');
// Result: { key: 'value' }

tryParseJson('invalid json');
// Result: undefined

tryParseJson('');
// Result: undefined
```

---

### selectPath

Accesses nested properties using JSONPath-like syntax.

```typescript
import { selectPath } from '@kata/stack-tests';
```

#### Signature

```typescript
function selectPath(root: unknown, path: string): unknown
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `root` | `unknown` | Object to traverse |
| `path` | `string` | Path expression |

#### Path Syntax

| Syntax | Description | Example |
|--------|-------------|---------|
| `prop` | Property access | `name` |
| `prop.nested` | Nested property | `user.email` |
| `arr[0]` | Array index | `items[0]` |
| `arr[0].prop` | Combined | `items[0].id` |

#### Example

```typescript
const data = {
  user: {
    id: 123,
    profile: {
      name: 'John',
    },
  },
  items: [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
  ],
};

selectPath(data, 'user.id');
// Result: 123

selectPath(data, 'user.profile.name');
// Result: 'John'

selectPath(data, 'items[0].name');
// Result: 'First'

selectPath(data, 'items[1].id');
// Result: 2

selectPath(data, 'nonexistent');
// Result: undefined
```

---

### parseExpected

Parses expected values with type coercion and variable interpolation.

```typescript
import { parseExpected } from '@kata/stack-tests';
```

#### Signature

```typescript
function parseExpected(input: string, world: World): unknown
```

#### Behavior

| Input | Result |
|-------|--------|
| `"null"` | `null` |
| `"true"` | `true` |
| `"false"` | `false` |
| `"123"` (numeric) | `123` (number) |
| `"{varName}"` | Value from world.vars |
| `"text"` | `"text"` (string) |

#### Example

```typescript
const world = { vars: { count: '42' }, headers: {}, cleanup: [] };

parseExpected('null', world);     // null
parseExpected('true', world);     // true
parseExpected('123', world);      // 123 (number)
parseExpected('{count}', world);  // '42'
parseExpected('hello', world);    // 'hello'
```

---

## Assertions

### assertMasked

Asserts that a value equals `'****'` (masked value).

```typescript
import { assertMasked } from '@kata/stack-tests';
```

#### Signature

```typescript
function assertMasked(val: unknown): void
```

#### Example

```typescript
assertMasked('****');  // Passes
assertMasked('secret'); // Throws error
```

---

## Cleanup

### registerCleanup

Adds an item to the world's cleanup queue.

```typescript
import { registerCleanup } from '@kata/stack-tests';
```

#### Signature

```typescript
function registerCleanup(
  world: World,
  item: {
    method?: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
    path: string;
    headers?: Record<string, string>;
  }
): void
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | `string` | `'DELETE'` | HTTP method for cleanup |
| `path` | `string` | Required | Cleanup endpoint path |
| `headers` | `Record<string, string>` | `{}` | Additional headers |

#### Example

```typescript
// Register DELETE cleanup
registerCleanup(world, {
  path: '/users/123',
});

// Register with specific method
registerCleanup(world, {
  method: 'POST',
  path: '/users/123/deactivate',
});

// Register with headers
registerCleanup(world, {
  path: '/users/123',
  headers: { 'X-Force': 'true' },
});
```

---

## World Management

### initWorld

Creates a new initialized World object.

```typescript
import { initWorld } from '@kata/stack-tests';
```

#### Signature

```typescript
function initWorld(): World
```

#### Returns

```typescript
{
  vars: {},
  headers: {},
  cleanup: [],
}
```

#### Example

```typescript
const world = initWorld();
world.vars['key'] = 'value';
world.headers['Authorization'] = 'Bearer token';
```

---

## World Type

### World

The test state container type.

```typescript
import type { World, CleanupItem } from '@kata/stack-tests';
```

#### Definition

```typescript
type World = {
  vars: Record<string, string>;
  headers: Record<string, string>;
  cleanup: CleanupItem[];
  skipCleanup?: boolean;
  
  // Response state (set by API steps)
  lastResponse?: APIResponse;
  lastStatus?: number;
  lastText?: string;
  lastJson?: unknown;
  lastHeaders?: Record<string, string>;
  lastContentType?: string;
};

type CleanupItem = {
  method: 'DELETE' | 'POST' | 'PATCH' | 'PUT';
  path: string;
  headers?: Record<string, string>;
};
```

---

## Usage in Step Definitions

### Complete Example

```typescript
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { interpolate, selectPath, registerCleanup } from '@kata/stack-tests';

const { When, Then } = createBdd(test);

When('I create a user with email {string}', async ({ api, world }, email) => {
  // Interpolate variables in email
  const resolvedEmail = interpolate(email, world.vars);
  
  // Send request
  const result = await api.sendJson('POST', '/users', {
    email: resolvedEmail,
  }, world.headers);
  
  // Store response
  world.lastStatus = result.status;
  world.lastJson = result.json;
  
  // Extract and store ID
  const userId = selectPath(result.json, 'id');
  world.vars['userId'] = String(userId);
  
  // Register cleanup
  registerCleanup(world, {
    path: `/users/${userId}`,
  });
});

Then('the user ID should be stored', async ({ world }) => {
  const userId = world.vars['userId'];
  if (!userId) {
    throw new Error('userId not set');
  }
});
```

---

## Related Topics

- [World State](../../concepts/world-state.md) - State management
- [API Steps Reference](../steps/api-steps.md) - Using utilities in steps
- [Custom Steps Guide](../../guides/custom-steps.md) - Writing steps
