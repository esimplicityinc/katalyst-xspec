# Best Practices

Practical rules for keeping a katalyst-xspec project easy to read, fast to run, and cheap to maintain as it grows. None of these are enforced by the framework; they're what works well.

## Organizing feature files

### Folders decide what runs together

Each Playwright project picks up the feature files in its folder. A new project has two:

```
features/
├── api/        # scenarios that only use API steps
├── ui/         # scenarios that use the browser (may also use API steps)
└── steps/      # fixtures.ts, steps.ts and your custom steps
```

Use folders for **how a test runs** and, inside them, subfolders for **what part of the product it covers**:

```
features/
├── api/
│   ├── accounts/
│   │   ├── create-account.feature
│   │   └── close-account.feature
│   └── billing/
│       └── invoices.feature
├── ui/
│   ├── accounts/
│   │   └── sign-up.feature
│   └── checkout/
│       ├── cart.feature
│       └── payment.feature
└── steps/
```

Guidelines:

- **Put a scenario in `ui/` if it uses the browser at all**, even if most of its steps are API calls. `api/` scenarios then never need a browser, which keeps them fast.
- **Mirror your product's areas** (accounts, billing, checkout) in subfolders. People find tests by feature, not by test type.
- **One feature file per capability.** Name it for what the user does: `create-account.feature`, not `test1.feature` or `accounts-tests.feature`.
- **Keep feature files short:** roughly 3–10 scenarios. If a file keeps growing, it's usually two features.
- **Only add another project** (in `playwright.config.ts`) when tests need different settings: a different browser, a different base URL, or serial execution. Don't add one just to group files; a subfolder does that.

You can run one folder or file directly:

```bash
npx playwright test --project ui
npx playwright test features/ui/checkout
```

### Writing a feature file

```gherkin
Feature: Close an account
  Account owners can close their account. Closed accounts can't log in.

  Background:
    Given I am authenticated as "admin" via API

  Scenario: Closing an account stops further logins
    Given I generate a UUID and store as "id"
    When I POST "/api/accounts" with JSON body:
      """
      { "email": "close-me-{id}@example.com" }
      """
    Then the response status should be 201
    And I store the value at "id" as "accountId"
    When I DELETE "/api/accounts/{accountId}"
    Then the response status should be 204
```

- **The `Feature:` description says why it matters**, in one or two lines, for the person reading it.
- **The scenario title describes the behaviour and the outcome**, not the steps: "Closing an account stops further logins", not "POST then DELETE".
- **Use `Background:` only for setup every scenario in the file needs**, like logging in. If only some scenarios need it, put it in those scenarios.

## Tags

Tags are optional labels you add above a `Feature:` or `Scenario:`. **The built-in steps never need them**, and which folder a file is in already decides which project runs it. Use tags for one thing: **choosing a subset of scenarios to run**.

### A small, agreed set

Pick a handful of tags, write them down (the project README is fine), and stick to them. A good starting set:

| Tag | Meaning | Typical use |
|-----|---------|-------------|
| `@smoke` | A few critical paths that must always work | On every deploy: `TEST_TAGS=smoke npm test` |
| `@regression` | The broader suite | Nightly, or before a release |
| `@slow` | Takes much longer than average | Excluded from quick runs |
| `@wip` | Still being written | Excluded from CI until finished |
| `@Skip` | Temporarily disabled | Skipped automatically; always add a reason |

Product-area tags (`@billing`, `@accounts`) are rarely needed: that's what subfolders are for. Add one only if you really run that area on its own across several folders.

### Rules of thumb

- **Tag the scenario, not the feature,** unless every scenario in the file belongs in the group.
- **Keep `@smoke` small.** If more than about 10% of scenarios are smoke tests, it stops being a quick check.
- **Always say why something is skipped**, and link the ticket:

  ```gherkin
  # Skipped until PAY-412 is fixed: refunds API returns 500 on staging
  @Skip
  Scenario: Refund a paid invoice
  ```

  `@Skip` and `@ignore` are excluded by default (they're case-sensitive: `@skip` is not). Review skipped scenarios regularly; old ones should be fixed or deleted.

- **Don't recreate the old type tags.** `@api`, `@ui`, `@hybrid` and `@tui` used to be required; they aren't any more and have no effect. Delete them when you touch a file.

### Running by tag

```bash
TEST_TAGS=smoke npm test                     # one tag
TEST_TAGS=smoke,critical npm test            # either tag (comma list, no @)
TEST_TAGS="@smoke and not @slow" npm test    # any Cucumber tag expression
```

Avoid `TEST_TAGS=@smoke,@critical`: once a value contains `@` it's used as an expression as-is, and that isn't a valid one. Use `smoke,critical` or `"@smoke or @critical"`.

To keep `@wip` out of every run without remembering a flag, add it to the default excludes in `playwright.config.ts`:

```typescript
const tags = tagsForProject({
  extraTags: resolveExtraTags(process.env.TEST_TAGS),
  defaultExcludes: 'not @Skip and not @ignore and not @wip',
});
```

More detail: [Tags](../concepts/tag-system.md).

## Writing good scenarios

**Describe what the user does and sees, not how the page is built.** Prefer labels, button text and placeholders over CSS selectors:

```gherkin
# Good: survives a redesign
When I fill the placeholder "Email" with "ada@example.com"
And I click the button "Sign in"

# Fragile: breaks when markup changes
When I click the element "div.form > button.btn-primary:nth-child(2)"
```

When you do need a selector, ask developers to add a stable `data-test` / `data-testid` attribute and use that: `"[data-test='checkout-button']"`.

**One behaviour per scenario.** A scenario that checks sign-up, profile editing and logout fails for three different reasons and tells you little. Split it.

**Keep scenarios independent.** Each scenario must pass when run alone and in any order. Never rely on data a previous scenario created; create what you need in the scenario (or its `Background`).

**Assert the outcome that matters.** End each scenario with a `Then` that proves the behaviour worked, not just that a page loaded.

**Use `Scenario Outline` for the same behaviour with different data**, instead of copying scenarios:

```gherkin
Scenario Outline: Invalid sign-ups are rejected
  When I POST "/api/accounts" with JSON body:
    """
    { "email": "<email>" }
    """
  Then the response status should be 400

  Examples:
    | email          |
    |                |
    | not-an-email   |
    | a@             |
```

**Never wait a fixed time** (`When I wait "5" seconds`) to "make it pass". Assertions like `Then I should see text "Saved"` already wait for the text to appear. Fixed waits make suites slow and still flaky.

## Test data

**Make data unique per run** so parallel and repeated runs don't collide:

```gherkin
Given I generate a UUID and store as "id"
And I set variable "email" to "user-{id}@example.com"
```

**Create data through the API, check it through the UI.** It's much faster and more reliable than clicking through setup screens:

```gherkin
Given I generate a UUID and store as "id"
And I am authenticated as "admin" via API
When I POST "/api/projects" with JSON body:
  """
  { "name": "Apollo {id}" }
  """
Then the response status should be 201
Given I am logged in as "admin"
And I navigate to "/projects"
Then I should see text "Apollo {id}"
```

**Clean up what you create.** Register what to delete and it's removed after the scenario, even if the scenario fails. Either set `CLEANUP_RULES` once so stored IDs are cleaned up automatically, or register explicitly:

```gherkin
And I register cleanup DELETE "/api/projects/{projectId}"
```

See [World State](../concepts/world-state.md) for how variables and cleanup work.

## Logging in

- **Log in by role name** (`"admin"`, `"pm"`, `"auditor"`), and use a dedicated test account per role. Never use a real person's account.
- **Use `Given I am logged in as "pm"` for normal UI tests.** It reuses the session, so it's fast. Keep `When I log in as "pm" in UI` for scenarios that test the login page itself.
- **Prefer API login for API scenarios.** `Given I am authenticated as "pm" via API` doesn't start a browser.
- **Never commit passwords.** Keep them in `.env` locally (it's git-ignored) and in your CI secret store, as `AUTH_<ROLE>_*` variables.

See the [Authentication guide](./authentication.md).

## Environments and configuration

- **Use relative paths in steps** (`"/login"`, `"/api/users"`) and set `FRONTEND_URL` / `API_BASE_URL` per environment. The same scenarios then run against local, staging and production-like environments.
- **Commit `.env.example`, not `.env`.** List every variable the project needs, with safe placeholder values.
- **Check the `katalyst-xspec targets:` line** at the start of a run when something fails unexpectedly; it shows exactly which URLs were used.
- **Keep settings in `.env`, not in step code.** If a value differs between environments, it belongs in configuration.

## Custom steps

Write a custom step only when no built-in step says what you need. Check the [Step quick reference](../reference/steps/quick-reference.md) first.

- **Name steps after business actions**, not mechanics: `When I approve the invoice "{id}"`, not `When I click the third button in the table`.
- **Keep them in `features/steps/`**, one file per product area (`billing.steps.ts`), and register them from `steps.ts`.
- **Build them from the ports** (`api`, `ui`, `auth`, `world`) rather than Playwright's `page`, so they keep working if an adapter changes. See [Ports and Adapters, Explained](../concepts/ports-and-adapters.md).
- **Don't edit built-in steps** to suit one app. Change a setting, an adapter, or add your own step.
- **Generate a starting point** with `npx katalyst-xspec stubs` when a scenario uses a step that doesn't exist yet.

More: [Custom Steps](./custom-steps.md).

## Running in CI

- **Run `@smoke` on every pull request or deploy**, and the full suite nightly or before release.
- **Keep CI workers modest.** By default `resolveWorkers()` uses 1 worker in CI for stability; raise it with `WORKERS` once the suite is reliably independent.
- **Keep the reports.** Upload `cucumber-report/` and Playwright's `test-results/` (traces and screenshots of failures) as build artifacts.
- **Fix or quarantine flaky tests quickly.** Tag a flaky scenario `@Skip` with a ticket rather than letting people get used to red builds.

See [CI/CD Integration](./ci-cd.md).

## Maintenance

- **Review tags and skipped scenarios** every few weeks: remove stale `@wip` and `@Skip`, and keep `@smoke` small.
- **Delete tests that no longer describe real behaviour.** An outdated scenario is worse than none.
- **Upgrade regularly** with `npx katalyst-xspec upgrade`. Small, frequent upgrades are easier than big jumps. Read the [CHANGELOG](https://github.com/esimplicityinc/katalyst-xspec/blob/main/CHANGELOG.md) for breaking changes.
- **Treat feature files as documentation.** If a scenario is hard to read, rewrite it; someone will rely on it to understand the product.

## Quick checklist

Before you open a pull request with new tests:

- [ ] The feature file is in the right folder (`ui/` if it touches the browser) and a sensible subfolder
- [ ] Scenario titles describe behaviour and outcome
- [ ] Each scenario passes on its own and in any order
- [ ] No CSS selectors where a label, button name or `data-test` attribute would do
- [ ] No fixed waits
- [ ] Data is unique per run and cleaned up
- [ ] Only agreed tags are used; any `@Skip` has a reason and a ticket
- [ ] No passwords or environment URLs hard-coded in feature files
