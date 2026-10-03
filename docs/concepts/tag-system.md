# Tags

> For a recommended tag set and how to organize feature files, see [Best Practices](../guides/best-practices.md#tags).

Tags are optional. Use them for your own grouping (`@smoke`, `@wip`, `@regression`, ...) and filtering. They don't decide which steps are available.

## How Scenarios Are Selected

- **Projects pick feature files by folder.** Each Playwright project reads one folder, e.g. `features/api/**/*.feature` or `features/ui/**/*.feature`.
- **Steps are untagged.** Every built-in step (API, UI, TUI, shared) works in any scenario. A single scenario can mix API and UI steps — that's all a "hybrid" test is.
- **Tags only filter.** The scaffolded config skips scenarios tagged `@Skip` or `@ignore`, and applies any extra tags you pass via `TEST_TAGS`.

```typescript
// playwright.config.ts (as scaffolded by `katalyst-xspec init`)
import { defineBddProject } from 'playwright-bdd';
import { tagsForProject, resolveExtraTags } from '@esimplicitylabs/katalyst-xspec';

const tags = tagsForProject({ extraTags: resolveExtraTags(process.env.TEST_TAGS) });

const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags,
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags,
});
```

## Custom Tags

Add tags to a feature, rule, or scenario. Tags on a feature or rule apply to every scenario inside it; scenario tags add to them.

```gherkin
@smoke
Feature: Health checks

  Scenario: API is up
    When I GET "/health"
    Then the response status should be 200

  @slow @external
  Scenario: Sync with partner
    When I GET "/external-sync"
    Then the response status should be 200
```

Common conventions (none are built in, except `@Skip`/`@ignore`):

| Tag | Typical meaning |
|-----|-----------------|
| `@Skip` / `@ignore` | Never run (excluded by the default expression) |
| `@smoke` | Quick sanity checks |
| `@wip` | Work in progress |
| `@regression` | Full regression suite |
| `@slow` | Long-running |
| `@external` | Needs a third-party service |

## Filtering with `TEST_TAGS`

```bash
TEST_TAGS=@smoke npm test                    # one tag
TEST_TAGS=smoke,critical npm test            # comma list -> "@smoke or @critical"
TEST_TAGS="@smoke and not @slow" npm test    # full tag expression
```

Tag expressions support `and`, `or`, `not` and parentheses.

## Running One Area

```bash
npx playwright test --project api            # just features/api
npx playwright test --project ui             # just features/ui
npx playwright test --grep "@smoke"          # filter generated tests by tag
TEST_TAGS=@critical npx playwright test --project api
```

You can also pass a folder or file path to run a subset.

## Configuration Helpers

### tagsForProject

Builds a playwright-bdd `tags` expression: default excludes, an optional project tag, and optional extra tags.

```typescript
import { tagsForProject } from '@esimplicitylabs/katalyst-xspec';

tagsForProject()
// "not @Skip and not @ignore"

tagsForProject({ extraTags: '@smoke' })
// "not @Skip and not @ignore and (@smoke)"

tagsForProject({ projectTag: '@smoke' })
// "not @Skip and not @ignore and @smoke"

tagsForProject({ defaultExcludes: 'not @Skip and not @ignore and not @wip' })
// "not @Skip and not @ignore and not @wip"
```

`projectTag` is optional and not needed for the built-in steps. Use it only if you want a project limited to one of your own tags.

### resolveExtraTags

Normalizes tag input from an environment variable or CLI:

```typescript
import { resolveExtraTags } from '@esimplicitylabs/katalyst-xspec';

resolveExtraTags('@smoke or @critical')  // "@smoke or @critical" (expression passed through)
resolveExtraTags('smoke,critical')       // "@smoke or @critical"
resolveExtraTags('smoke')                // "@smoke"
resolveExtraTags('')                     // undefined
```

## Managing Work-in-Progress Features

When writing features incrementally, some scenarios may not have step definitions yet. Tag them `@wip` and exclude that tag so the rest of the suite still generates and runs:

```gherkin
@wip
Feature: Payment Processing

  Scenario: Process credit card payment
    Given the payment gateway is configured
    When I process payment for "order-123"
    Then the transaction should be recorded
```

```typescript
// playwright.config.ts
const tags = tagsForProject({
  defaultExcludes: 'not @Skip and not @ignore and not @wip',
  extraTags: resolveExtraTags(process.env.TEST_TAGS),
});
```

**Workflow:**

1. Write the feature file with `@wip`
2. Run `npm run gen:stubs` to generate step stubs
3. Implement the step definitions
4. Remove `@wip`
5. Run `npm test`

## Upgrading from 0.6 and Earlier

Older versions scoped steps to `@api`, `@ui`, `@hybrid` and `@tui`, and projects filtered on those tags. That is gone:

- Run `npx katalyst-xspec upgrade --migrate` to remove the old `@api`/`@ui`/`@hybrid`/`@tui` filters from `playwright.config.*`.
- Feature files that still carry `@api`, `@ui`, etc. keep working — the tags are simply ignored. Delete them whenever convenient.
- Custom steps no longer need `{ tags: ... }`.

## Related Topics

- [Project Setup](../getting-started/project-setup.md) - Playwright config
- [Configuration Reference](../reference/api/configuration.md) - `tagsForProject`, `resolveExtraTags`
- [Step Quick Reference](../reference/steps/quick-reference.md)
