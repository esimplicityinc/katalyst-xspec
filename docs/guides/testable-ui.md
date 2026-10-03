# Good UI Tests Don't Have to Suck

Most teams have met the bad kind of UI test suite: a separate job nobody owns, red half the time, fixed by adding `sleep(5)` and a retry. People stop trusting it, then stop reading it, then turn it off.

That isn't what UI testing is. It's what UI testing becomes when **the UI isn't built to be tested** and **the tests are written against how the page looks instead of what it does**. Both are fixable. This page explains the thinking behind katalyst-xspec's UI steps and what to ask of the app so tests stay boring, fast and trustworthy.

## The orientation: test like a user

A user doesn't know your CSS classes or your DOM structure. They see a button that says **Save**, a field labelled **Email**, a message that says **Saved**. If a test finds things the same way, it:

- keeps working through redesigns, refactors and framework migrations;
- reads like the requirement it checks;
- fails when the user would actually be stuck, and not otherwise.

That's why the built-in steps lead with what a person sees:

```gherkin
When I fill the field "Email" with "ada@example.com"
And I click the button "Save"
Then I should see text "Saved"
```

`I click the button "Save"` finds a button by its **accessible name**, the text a screen reader would announce. It doesn't look for "the third `<div>` with class `btn-primary`". If a developer restyles the page, the test doesn't care. If they rename the button to "Submit", the test fails, which is right: the requirement changed.

## The biggest anti-patterns

These cause most of the pain in UI test suites, roughly in order of damage. Each has a better alternative in katalyst-xspec.

### 1. Sleeping instead of waiting

```gherkin
# Anti-pattern
When I click the button "Save"
And I wait "5" seconds
Then the element "#toast" should be visible
```

Too short on a slow day, wasted time on a fast one, and it multiplies across hundreds of scenarios. **Instead:** assert the outcome. Assertion steps keep checking until it's true.

```gherkin
When I click the button "Save"
Then I should see text "Saved"
```

### 2. Selectors tied to layout

```gherkin
# Anti-pattern
When I click the element "#root > div > main > div:nth-child(3) > button.btn.btn-primary"
```

Breaks on every redesign, and nobody can tell what it clicks. **Instead:** the button's name, a field's label, or a `data-testid` that names the thing.

```gherkin
When I click the button "Approve"
When I "click" the "1st" element with "approve-invoice-1042" "test ID"
```

### 3. Scenarios that depend on each other

`01_create_user.feature`, `02_edit_user.feature`, `03_delete_user.feature`: each relies on what the last one left behind. One failure cascades, they can't run in parallel, and you can't run one on its own. **Instead:** every scenario creates its own data (with a UUID) and registers cleanup. See [Test data](./best-practices.md#test-data).

### 4. Doing all the setup through the UI

Clicking through sign-up, onboarding and three settings screens before checking the one screen you care about. Slow, and it fails for reasons unrelated to the test. **Instead:** create data through the API, and log in with `Given I am logged in as "pm"`, which reuses the session.

### 5. Retrying until it passes

Setting `retries: 3` makes the build green and hides real race conditions, in the tests or in the product. **Instead:** keep retries at 0 or 1, and treat every pass-on-retry as a bug to fix. Quarantine with `@Skip` and a ticket if it can't be fixed today.

### 6. Forcing your way past the UI

`force click` through an overlay, `dispatch click` on a disabled button, injecting JavaScript to set a field. The test passes while a real user is stuck. **Instead:** find out why the element isn't clickable; usually the test is ahead of the app, or the app has a real bug.

### 7. Asserting that something exists instead of that it worked

```gherkin
# Anti-pattern: proves the page loaded, not that the order was placed
Then the element "#order-summary" should be visible
```

**Instead:** assert the outcome the user cares about.

```gherkin
Then I should see text "Thank you for your order!"
Then the URL should contain "/orders/"
```

### 8. One giant scenario

A 60-step scenario that signs up, edits a profile, places an order and logs out. When it fails you learn little, and nobody wants to maintain it. **Instead:** one behaviour per scenario, with setup in the API or a `Background`.

### 9. Hard-coded environments and credentials

`Given I navigate to "https://staging.myapp.com/login"` and real passwords in feature files. Tests can't move between environments, and secrets end up in git. **Instead:** relative paths, `FRONTEND_URL` per environment, and `AUTH_<ROLE>_*` in `.env` or CI secrets.

### 10. Tests in a separate job nobody owns

A UI suite in another repository, run nightly by a different team, red for weeks. **Instead:** tests live with the feature, run on its pull requests, and belong to the team that builds it. See [Where UI tests belong](#where-ui-tests-belong).

## Why UI test suites go bad

| Symptom | Real cause | What to do instead |
|---------|-----------|--------------------|
| Tests break on every redesign | Selectors tied to layout (`div > div:nth-child(3) .btn`) | Find elements by role, label or text; add `data-testid` where there's nothing visible to use |
| "Flaky" failures that pass on retry | Fixed waits racing the app, or asserting before it's ready | Use assertions that wait for the outcome (`I should see text`), never fixed sleeps |
| Slow suites | Every test clicks through sign-up and setup screens | Create data through the API, log in once and reuse the session |
| Tests fail when run in a different order | Scenarios depend on data from earlier ones | Each scenario creates its own unique data and cleans it up |
| Nobody fixes failures | Tests live in a separate repo or job, owned by "QA" | Tests live next to the code, run on pull requests, owned by the team that owns the feature |
| Failures are hard to understand | Assertions like "element exists" instead of the outcome | End with a `Then` that states the behaviour the user cares about |
| Everything retried 3× | Retries hide real problems | Keep retries at 0–1; treat every retry-to-pass as a bug |

Notice that most of these are problems with **the app or the process**, not with the testing tool.

## Making the UI testable

Testability is a feature of the app, like accessibility or performance. It's cheap when it's built in and expensive to bolt on later. Most of it is the same work that makes the app accessible.

### 1. Give things accessible names

This is the single biggest win, and it helps real users too.

- Every input has a real `<label>` (or `aria-label`), not just a placeholder.
- Buttons and links have visible text, or an `aria-label` if they're icon-only.
- Use real elements: `<button>`, not a clickable `<div>`; `<a href>` for navigation.
- Headings, dialogs and alerts use the right roles (`<h1>`, `role="dialog"`, `role="alert"`).

Then the plain steps just work:

```gherkin
When I fill the field "Email" with "ada@example.com"
And I click the button "Create account"
Then I verify that "1st" element with "Create account" "text" is "visible"
```

### 2. Add test IDs where there's nothing to see

Some things have no stable visible text: rows in a table, a card in a grid, an icon button, a chart. Give them a `data-testid` that names what it **is**, not where it **is**:

```html
<!-- Good: describes the thing -->
<button data-testid="delete-invoice-1042" aria-label="Delete invoice 1042">🗑</button>

<!-- Bad: describes position, will change -->
<button data-testid="row3-btn2">🗑</button>
```

```gherkin
When I "click" the "1st" element with "delete-invoice-1042" "test ID"
```

Playwright reads `data-testid` by default. If your app uses `data-test` or `data-qa` instead, set it once in `playwright.config.ts`:

```typescript
use: { testIdAttribute: 'data-test' }
```

Rules for test IDs: stable across releases, unique on the page, meaningful, never generated from build hashes, and agreed with the developers (put them in the component, not added by testers afterwards).

### 3. Show state, don't hide it

Tests wait for **something observable**. If the app's only signal that it's done is "a spinner eventually disappears", tests end up guessing with sleeps. Give them something to wait for:

- Show a visible confirmation after actions ("Saved", "Invoice sent").
- Disable buttons while a request is in flight, and enable them after.
- Mark loading regions with `aria-busy="true"`, and put component state in attributes (`data-state="open"`, `aria-expanded="true"`).
- Change the URL when the user navigates somewhere meaningful.

```gherkin
Then I should see text "Invoice sent"
Then the element "[data-testid='sidebar']" should have attribute "data-state" equal to "expanded"
Then I verify that "1st" element with "Saving…" "text" becomes "hidden" during "10" seconds
```

### 4. Make data and environments predictable

- **An API for test setup.** If testers can create a user, project or order through the API, UI tests only exercise the screen under test. See [Hybrid Testing](./hybrid-testing.md).
- **Dedicated test accounts per role** in each environment, so tests log in as `"pm"` or `"admin"`, not as a person. See [Authentication](./authentication.md).
- **No hidden randomness** in what tests assert on: A/B tests, rotating banners, and "today's date" in key text should be controllable in test environments (feature flags, a fixed test clock, or a known test cohort).
- **Turn off or shorten animations** in test environments, or respect `prefers-reduced-motion`. Playwright waits for elements to be stable, but long animations still slow every step.

### 5. Provide test hooks deliberately, not as hacks

Some flows are slow or impossible to drive through the real UI every time: SSO, MFA, CAPTCHA, email verification, payments. The answer is an **explicit, documented test-only mechanism** in non-production environments, not a test that pokes at internals:

- a test login path or identity headers accepted only in test environments (see the header-based steps in [Authentication](./authentication.md#header-based-ui-auth));
- a test mode for the payment provider;
- an inbox API for verification emails.

Keep at least one scenario that goes through the real flow end to end, and use the hook everywhere else.

## Quick review checklist

If you see these in a pull request, stop and fix the cause (see [the anti-patterns](#the-biggest-anti-patterns) for why):

- `I wait "5" seconds` to make something pass. Wait for an outcome instead.
- `force click` or `dispatch click` to get past an overlay or a disabled button. Find out why a user couldn't click it.
- Long CSS selectors (`".app > main > div:nth-child(2) button"`). Ask for a label or a test ID.
- Clicking through five screens of setup before testing the sixth. Set up through the API.
- Scenarios numbered `01_`, `02_` because they only pass in order. Make each one independent.
- A test retried until it passes. Find the race.

The step library includes escape hatches (`locator`, `force click`, `dispatch click`, fixed waits) because sometimes you need them while the app catches up. Treat every use as **testability debt**: leave a comment and a ticket, and remove it when the app is fixed.

## Asking developers for testability

Testers often feel they can't ask for app changes. You can, and it's cheaper for everyone. A short checklist to agree with your developers:

- [ ] Every form field has a label; every button and link has a name
- [ ] Icon-only controls have an `aria-label`
- [ ] Repeated or nameless elements have a stable `data-testid`
- [ ] Actions show a visible confirmation or change the URL
- [ ] Loading and open/closed states are exposed as attributes
- [ ] Test data can be created and deleted through an API
- [ ] Each role has a test account in each environment
- [ ] Animations, feature flags and dates are controllable in test environments
- [ ] Test-only shortcuts (login, payments, email) exist and are documented

Most of these also make the product more accessible, which you may already be required to do.

## Where UI tests belong

The other half of "hacky UI test jobs" is process:

- **Same repository and pull request as the feature.** A feature isn't done until its scenarios pass.
- **Smoke tests on every pull request**, full suite nightly or before release ([Best Practices](./best-practices.md#running-in-ci)).
- **Owned by the team that owns the feature**, not a separate QA queue.
- **Not everything is a UI test.** Business rules belong in API or unit tests; UI tests prove the user can actually do the thing. A healthy suite has many fast API scenarios and fewer, focused UI ones.

## Related

- [Why a Built-in Step Library](../concepts/step-library.md): the thinking behind the steps you import
- [UI Testing](./ui-testing.md): how to write UI scenarios
- [UI steps reference](../reference/steps/ui-steps.md): every UI step
- [Best Practices](./best-practices.md): organizing features, tags, data and CI
