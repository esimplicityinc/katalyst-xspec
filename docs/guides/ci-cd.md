# CI/CD Integration Guide

Run @kata/stack-tests in continuous integration pipelines.

## GitHub Actions

### Basic Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Generate BDD tests
        run: npm run gen
      
      - name: Run tests
        run: npm test
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          DEFAULT_ADMIN_USERNAME: ${{ secrets.ADMIN_USERNAME }}
          DEFAULT_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            cucumber-report/
            test-results/
          retention-days: 30
```

### With TUI Testing

```yaml
# .github/workflows/e2e-with-tui.yml
name: E2E Tests (including TUI)

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install tmux (for TUI testing)
        run: sudo apt-get update && sudo apt-get install -y tmux
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Generate BDD tests
        run: npm run gen
      
      - name: Run API tests
        run: npx playwright test --project=api
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
      
      - name: Run UI tests
        run: npx playwright test --project=ui
        env:
          FRONTEND_URL: ${{ secrets.FRONTEND_URL }}
      
      - name: Run TUI tests
        run: npx playwright test --project=tui
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            cucumber-report/
```

### Matrix Testing

```yaml
# .github/workflows/matrix-tests.yml
name: Cross-Browser Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project: [api, ui-chrome, ui-firefox]
        include:
          - project: api
            browser: ''
          - project: ui-chrome
            browser: chromium
          - project: ui-firefox
            browser: firefox
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install browser
        if: matrix.browser != ''
        run: npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Generate BDD tests
        run: npm run gen
      
      - name: Run tests
        run: npx playwright test --project=${{ matrix.project }}
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results-${{ matrix.project }}
          path: playwright-report/
```

### Scheduled Tests

```yaml
# .github/workflows/nightly.yml
name: Nightly E2E Tests

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  full-suite:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install all browsers
        run: npx playwright install --with-deps
      
      - name: Install tmux
        run: sudo apt-get install -y tmux
      
      - name: Run full test suite
        run: npm test
        env:
          API_BASE_URL: ${{ secrets.STAGING_API_URL }}
          FRONTEND_URL: ${{ secrets.STAGING_FRONTEND_URL }}
      
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Nightly E2E tests failed! <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Docker

### Dockerfile

```dockerfile
# Dockerfile.e2e
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Install tmux for TUI testing
RUN apt-get update && apt-get install -y tmux && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy test files
COPY . .

# Generate tests
RUN npm run gen

# Run tests
CMD ["npm", "test"]
```

### Docker Compose

```yaml
# docker-compose.e2e.yml
version: '3.8'

services:
  api:
    image: your-api:latest
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgres://...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  frontend:
    image: your-frontend:latest
    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy

  e2e:
    build:
      context: ./stack-tests
      dockerfile: Dockerfile.e2e
    depends_on:
      - api
      - frontend
    environment:
      - API_BASE_URL=http://api:4000
      - FRONTEND_URL=http://frontend:3000
    volumes:
      - ./test-results:/app/test-results
      - ./cucumber-report:/app/cucumber-report
```

### Run with Docker Compose

```bash
docker-compose -f docker-compose.e2e.yml up --build --exit-code-from e2e
```

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.49.0-jammy
  
  before_script:
    - apt-get update && apt-get install -y tmux
    - npm ci
    - npm run gen
  
  script:
    - npm test
  
  artifacts:
    when: always
    paths:
      - playwright-report/
      - cucumber-report/
    expire_in: 1 week
  
  variables:
    API_BASE_URL: $API_BASE_URL
    FRONTEND_URL: $FRONTEND_URL
```

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  playwright: playwright/playwright@1.0.0

jobs:
  e2e-tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.49.0-jammy
    steps:
      - checkout
      - run:
          name: Install tmux
          command: apt-get update && apt-get install -y tmux
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Generate tests
          command: npm run gen
      - run:
          name: Run tests
          command: npm test
      - store_artifacts:
          path: playwright-report
      - store_artifacts:
          path: cucumber-report

workflows:
  test:
    jobs:
      - e2e-tests
```

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      sudo apt-get update
      sudo apt-get install -y tmux
    displayName: 'Install tmux'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps chromium
    displayName: 'Install Playwright'

  - script: npm run gen
    displayName: 'Generate BDD tests'

  - script: npm test
    displayName: 'Run tests'
    env:
      API_BASE_URL: $(API_BASE_URL)
      FRONTEND_URL: $(FRONTEND_URL)

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/junit.xml'

  - task: PublishPipelineArtifact@1
    condition: always()
    inputs:
      targetPath: 'cucumber-report'
      artifact: 'cucumber-report'
```

## Configuration Tips

### Playwright Config for CI

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Fail fast in CI
  maxFailures: process.env.CI ? 10 : undefined,
  
  // Single worker in CI for stability
  workers: process.env.CI ? 1 : undefined,
  
  // Retries in CI
  retries: process.env.CI ? 2 : 0,
  
  // Longer timeouts in CI
  timeout: process.env.CI ? 60000 : 30000,
  
  // Reporters
  reporter: process.env.CI 
    ? [
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ]
    : [['list'], ['html']],
  
  use: {
    // Traces for debugging failures
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Headless in CI
    headless: true,
  },
});
```

### Environment Variables

```bash
# CI environment variables
API_BASE_URL=https://api.staging.example.com
FRONTEND_URL=https://staging.example.com

DEFAULT_ADMIN_USERNAME=admin@test.com
DEFAULT_ADMIN_PASSWORD=TestAdmin123

DEFAULT_USER_USERNAME=user@test.com
DEFAULT_USER_PASSWORD=TestUser123

# CI-specific
CI=true
HEADLESS=true
```

### Secrets Management

```yaml
# GitHub Actions - use secrets
env:
  API_BASE_URL: ${{ secrets.API_BASE_URL }}
  DEFAULT_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

# GitLab CI - use CI/CD variables
variables:
  API_BASE_URL: $API_BASE_URL  # Defined in GitLab settings
```

## Parallel Execution

### Sharding

```yaml
# GitHub Actions with sharding
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    
    steps:
      # ... setup steps ...
      
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
```

### Merge Reports

```yaml
  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        
      - name: Merge reports
        run: npx playwright merge-reports ./all-reports --reporter=html
```

## Debugging CI Failures

### Enable Traces

```typescript
// playwright.config.ts
use: {
  trace: 'on',  // Always capture traces
}
```

### Download Artifacts

```yaml
- name: Upload trace files
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: traces
    path: test-results/
```

### View Traces

```bash
# Download and view locally
npx playwright show-trace trace.zip
```

## Best Practices

### 1. Use Dedicated Test Accounts

```bash
# Don't use production credentials
DEFAULT_ADMIN_USERNAME=ci-admin@test.com
```

### 2. Clean Test Data

```yaml
- name: Reset test data
  run: curl -X POST $API_BASE_URL/test/reset
```

### 3. Wait for Services

```yaml
- name: Wait for API
  run: |
    for i in {1..30}; do
      curl -s $API_BASE_URL/health && exit 0
      sleep 2
    done
    exit 1
```

### 4. Tag-Based Filtering

```yaml
# Run only smoke tests on PRs
- name: Run smoke tests
  if: github.event_name == 'pull_request'
  run: npx playwright test --grep "@smoke"

# Run full suite on main
- name: Run full suite
  if: github.ref == 'refs/heads/main'
  run: npm test
```

### 5. Fail Fast

```typescript
// playwright.config.ts
maxFailures: process.env.CI ? 5 : undefined,
```

## Related Topics

- [Project Setup](../getting-started/project-setup.md) - Playwright config
- [Tag System](../concepts/tag-system.md) - Filtering tests
- [Troubleshooting](#debugging-ci-failures) - Debug failures
