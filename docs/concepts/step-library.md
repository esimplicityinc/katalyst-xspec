# Why a Built-in Step Library

Your project imports its steps instead of writing them:

```typescript
// features/steps/steps.ts
import { registerApiSteps, registerUiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);
```

That one import gives every scenario more than 150 ready-made sentences. This page explains why the library exists, what decisions are baked into it, and when to reach past it.

## The problem it solves

Teams that adopt Cucumber-style testing on their own usually end up in the same place:

- **Every project reinvents the same steps.** "I click the button", "the response status should be", "I fill the field", written slightly differently each time.
- **The quick versions are the fragile ones.** The first `I click {string}` someone writes is often `page.click(selector)` with a CSS string, plus a sleep "just to be safe". It gets copied everywhere.
- **Steps drift.** Five ways to say "log in", three of them broken, nobody sure which to use.
- **Fixes don't spread.** When someone figures out how to make a step reliable, only their project benefits.

A shared library turns that into a solved problem. The good version of each step is written once, tested once, and used everywhere.

## The decisions baked in

The steps aren't just shortcuts for Playwright calls. Each one encodes a choice about how UI and API tests should behave.

### Find things the way a user does

The primary UI steps locate elements by what a person sees, using Playwright's role, label, placeholder and text locators:

| Step | What it actually looks for |
|------|----------------------------|
| `I click the button "Save"` | an element with the **button** role and the accessible name "Save" |
| `I click the link "Pricing"` | a **link** named "Pricing" |
| `I fill the field "Email" with "…"` | a field whose **label** is "Email" |
| `I fill the placeholder "Search" with "…"` | a field whose **placeholder** is "Search" |
| `I should see text "Saved"` | visible text "Saved" anywhere on the page |

These survive markup changes and fail only when the user-visible behaviour changes. See [Good UI Tests Don't Have to Suck](../guides/testable-ui.md).

### Wait for outcomes, not for time

Assertions such as `I should see text`, `the URL should contain` and `the element … should be visible` use Playwright's auto-waiting assertions. They keep checking until the condition is true or the timeout passes. Actions wait for the element to be visible, enabled and stable before clicking. So steps don't need sleeps, and a slow environment just takes a little longer instead of failing.

### State is explicit and per scenario

Steps communicate through the **World**: the last response, stored variables (`{userId}`), headers, and cleanup. It's created fresh for every scenario and thrown away afterwards, so one scenario can't break another. See [World State](./world-state.md).

### Steps talk to ports, not to Playwright

Steps call `api`, `ui`, `auth` and `cleanup`, never `page` directly. That's why one library fits every project: the parts that differ between apps (login flow, headers, base URLs) live in adapters and settings, not in the steps. See [Ports and Adapters, Explained](./ports-and-adapters.md).

### Failures should say what to fix

Steps fail with messages aimed at the person reading the CI log: which role had no credentials, which login returned 401 and what the server said, which field couldn't be found, which settings to check. A failing test that explains itself gets fixed; one that says `Timeout 30000ms exceeded` gets retried.

### Two vocabularies, on purpose

The UI steps come in two styles:

- **Plain steps** for everyday use, readable by anyone: `When I click the button "Save"`.
- **Precise steps** for when you need control over which element, how to find it, and how to interact:

  ```gherkin
  When I "click" the "2nd" element with "Edit" "text"
  When I "fill" "ada@example.com" in the "1st" element with "Email" "label"
  Then I verify that "1st" element with "Submit" "text" is "enabled"
  ```

  Locator methods: `text`, `label`, `placeholder`, `role`, `test ID`, `alternative text`, `title`, `locator` (CSS). Interactions: `click`, `force click`, `dispatch click`, `type`, `fill`, `choose`.

Start with the plain steps. Reach for the precise ones when a page has several matching elements or needs a specific locator.

## How it's kept reliable

"Battle-tested" should mean something you can check:

- **Built on Playwright's own locator engine and auto-waiting**, which is what many teams already rely on, rather than a home-grown selector layer.
- **Every built-in step is registered together in a test** that fails if any two steps could match the same sentence, or if any documented example step is ambiguous. That's why the step reference examples always work as written.
- **Browser-backed tests** cover the trickier steps and the login flows against real pages: form, JSON and cookie logins, label-only fields, wrong passwords and session reuse.
- **Runnable example projects** in `examples/` (API, UI, full-stack and TUI) exercise the steps against public demo sites and a real terminal app.
- **Fixes ship to everyone.** When a step is improved, every project gets it with `npx katalyst-xspec upgrade`, and breaking changes come with a migration in the [CHANGELOG](https://github.com/esimplicityinc/katalyst-xspec/blob/main/CHANGELOG.md).

## Escape hatches, and what they mean

The library deliberately includes steps you should rarely need:

| Step or option | When it's legitimate | What it usually signals |
|----------------|----------------------|-------------------------|
| `"locator"` method (CSS selector) | No label, text or test ID exists yet | Ask for a test ID |
| `force click` / `dispatch click` | Third-party widget you can't change | An overlay or disabled state a user would hit too |
| `I wait "5" seconds` | Demonstrating or debugging | A missing observable state; wait for an outcome instead |
| `I click on the top left corner of the page` | Closing a popover with no close button | A popover that's hard for keyboard users too |

They exist so you're never blocked. Leave a comment and a ticket each time you use one, and remove it once the app is fixed.

## When to write your own steps

The library is the floor, not the ceiling. Write a custom step when:

- you want a **business-level sentence** that hides several mechanical ones, such as `When I approve invoice "{invoiceId}"`;
- your app has a **component the built-in steps can't express**, such as a canvas, a drag-and-drop board or a rich-text editor;
- you need to **assert something domain-specific**.

Build custom steps from the same ports (`ui`, `api`, `auth`, `world`) so they follow the same rules. Don't copy and edit a built-in step to fix one app; change a setting or an adapter instead. See [Custom Steps](../guides/custom-steps.md).

## Related

- [Good UI Tests Don't Have to Suck](../guides/testable-ui.md): making the app testable
- [Step quick reference](../reference/steps/quick-reference.md): every step on one page
- [Ports and Adapters, Explained](./ports-and-adapters.md)
- [Best Practices](../guides/best-practices.md)
