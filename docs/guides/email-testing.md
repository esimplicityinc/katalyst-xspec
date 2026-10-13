# Email Testing

Check the emails your app sends (verification, password reset, magic links, one-time codes) and use what's in them, without a real mailbox. Point the app's SMTP settings at a mail catcher, and the email steps read from it.

```gherkin
Scenario: Sign up and verify the email address
  Given I navigate to "/signup"
  When I fill the field "Email" with "new-{runId}@test.local"
  And I click the button "Create account"
  Then "new-{runId}@test.local" receives an email with subject "Verify your email"
  When I open the link in the latest email to "new-{runId}@test.local"
  Then I should see text "Email verified"
```

## Setup

The built-in adapter is for [Mailpit](https://mailpit.axllent.org). Run it next to your app, for example with Docker:

```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Configure the app to send mail to SMTP port `1025`, then tell katalyst-xspec where Mailpit's web API is:

```bash
MAIL_API_URL=http://localhost:8025
```

| Setting | Default | Notes |
|---------|---------|-------|
| `MAIL_API_URL` | — | Mailpit's address (the web UI / API port). Required for the email steps |
| `MAIL_TIMEOUT` | `10000` | milliseconds to wait for an email to arrive |
| `MAIL_CODE_PATTERN` | 4 to 8 digits | a regular expression for codes; its first group, if any, is the code |

## Steps

```gherkin
Then "pm@test.local" receives an email with subject "Reset your password"
Then the latest email to "pm@test.local" should contain "expires in 15 minutes"
When I open the link in the latest email to "pm@test.local"
When I open the link containing "/reset" in the latest email to "pm@test.local"
Then I store the link from the latest email to "pm@test.local" as "resetLink"
Then I store the code from the latest email to "pm@test.local" as "code"
Given I clear the inbox
```

- Steps wait up to `MAIL_TIMEOUT` for a matching email, and **only look at emails received since the scenario started**, so mail from earlier scenarios doesn't count. Addresses are matched exactly (case-insensitive); subjects match if they contain the text.
- "The latest email to X" is the newest email to X in this scenario. Links come from the HTML part (`href`s), then URLs in the text part.
- Use unique addresses per scenario (e.g. with `{runId}` from `Given I generate a UUID and store as "runId"`) when scenarios run in parallel. `Given I clear the inbox` deletes every email, for all workers, so avoid it in parallel runs.

Example with a code sent by email:

```gherkin
When I fill the field "Email" with "pm@test.local"
And I click the button "Send code"
Then I store the code from the latest email to "pm@test.local" as "code"
When I fill the field "Code" with "{code}"
And I click the button "Sign in"
```

## Other mail catchers

The steps use the `mail` fixture, a [`MailPort`](../reference/api/ports.md#mailport). For MailHog, a cloud inbox API, or anything else, implement `latest`, `waitFor` and `clear`, and pass it to `createBddTest`:

```typescript
import { createBddTest, type MailPort } from '@esimplicitylabs/katalyst-xspec';

class MyInbox implements MailPort {
  async latest(query) { /* newest message matching query.to / query.subject / query.since */ }
  async waitFor(query, timeoutMs) { /* poll latest() until found or timeout */ }
  async clear() { /* delete everything */ }
}

export const { test } = createBddTest({ createMail: () => new MyInbox() });
```

Logins that send a one-time code by email can read it from the same inbox: set `AUTH_<ROLE>_OTP_SOURCE=email` (see [Codes from email or elsewhere](./authentication.md#codes-from-email-or-elsewhere)).

In your own steps, `emailLinks`, `emailLink` and `emailCode` (see [Utilities](../reference/api/utilities.md#email)) get links and codes out of a message.
