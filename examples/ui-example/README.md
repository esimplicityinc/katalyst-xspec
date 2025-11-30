# UI Testing Example

Demonstrates browser UI testing with @kata/stack-tests using The Internet (Heroku) as a test application.

## What This Example Shows

- Page navigation
- Form interactions (input, click, select)
- Element visibility assertions
- Text content verification
- Screenshot capture
- Handling alerts and prompts

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright browsers

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Copy environment file (optional)
cp .env.example .env
```

## Running Tests

```bash
# Run all tests
npm test

# Run with visible browser
npm run test:headed

# Run with Playwright inspector
npm run test:debug
```

## Feature Files

### login.feature
Tests the login page:
- Successful login
- Failed login with invalid credentials
- Form validation

### checkboxes.feature
Tests checkbox interactions:
- Checking/unchecking boxes
- Verifying checkbox state

### dropdown.feature
Tests dropdown selection:
- Selecting options
- Verifying selected values

## Project Structure

```
ui-example/
├── features/
│   ├── login.feature       # Login form tests
│   ├── checkboxes.feature  # Checkbox tests
│   └── dropdown.feature    # Dropdown tests
├── fixtures.ts             # Test configuration
├── playwright.config.ts    # Playwright setup
├── package.json
└── .env.example
```

## Customizing

### Use Different Base URL

Edit `.env`:

```bash
UI_BASE_URL=https://your-app.example.com
```

### Add More Browsers

Edit `playwright.config.ts`:

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

### Enable Visual Comparison

```typescript
use: {
  screenshot: 'on',
},
```

## Related Documentation

- [UI Testing Guide](../../docs/guides/ui-testing.md)
- [UI Steps Reference](../../docs/reference/steps/ui-steps.md)
