#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

// Agent skill directories configuration
const SKILL_AGENTS = {
  'opencode': '.opencode/skills',
  'claude-code': '.claude/skills',
  'cursor': '.cursor/skills',
  'generic': 'skills',
};

const SKILL_AGENT_LABELS = {
  'opencode': 'OpenCode (.opencode/skills/)',
  'claude-code': 'Claude Code (.claude/skills/)',
  'cursor': 'Cursor (.cursor/skills/)',
  'generic': 'Generic (skills/)',
};

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function promptYesNo(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

async function promptMultiSelect(question, options) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}`);
  });
  
  return new Promise((resolve) => {
    rl.question('Enter numbers (comma-separated, e.g., 1,2,3): ', (answer) => {
      rl.close();
      const indices = answer.split(',')
        .map(s => parseInt(s.trim(), 10) - 1)
        .filter(i => i >= 0 && i < options.length);
      const selected = indices.map(i => options[i].key);
      resolve(selected.length > 0 ? selected : ['generic']); // Default to generic if none selected
    });
  });
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function copySkillsToAgents(targetDir, agents, results) {
  const skillsSourceDir = path.join(__dirname, '..', 'skills');
  
  // Check if skills source exists
  if (!(await pathExists(skillsSourceDir))) {
    console.log('  Warning: Skills source directory not found, skipping skills installation');
    return;
  }
  
  // Get list of skill directories
  const skillDirs = await fs.readdir(skillsSourceDir, { withFileTypes: true });
  const skills = skillDirs.filter(d => d.isDirectory()).map(d => d.name);
  
  for (const agent of agents) {
    const agentSkillsDir = path.join(targetDir, SKILL_AGENTS[agent]);
    
    for (const skill of skills) {
      const srcSkillDir = path.join(skillsSourceDir, skill);
      const destSkillDir = path.join(agentSkillsDir, skill);
      
      await copyDir(srcSkillDir, destSkillDir);
      results.skills.push(path.relative(process.cwd(), destSkillDir));
    }
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFileSafe(filePath, content, { force, results }) {
  const exists = await pathExists(filePath);
  if (exists && !force) {
    results.skipped.push(filePath);
    return;
  }
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  results.created.push(filePath);
}

async function detectPackageManager(startDir) {
  let dir = startDir;
  while (true) {
    if (await pathExists(path.join(dir, 'bun.lockb'))) return 'bun';
    if (await pathExists(path.join(dir, 'bun.lock'))) return 'bun';
    if (await pathExists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await pathExists(path.join(dir, 'yarn.lock'))) return 'yarn';
    if (await pathExists(path.join(dir, 'package-lock.json'))) return 'npm';
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'npm';
}

function commandsFor(pm) {
  switch (pm) {
    case 'bun':
      return { install: 'bun install', test: 'bun run test' };
    case 'pnpm':
      return { install: 'pnpm install', test: 'pnpm test' };
    case 'yarn':
      return { install: 'yarn install', test: 'yarn test' };
    default:
      return { install: 'npm install', test: 'npm test' };
  }
}

function parseArgs(argv) {
  const args = { 
    dir: 'stack-tests', 
    force: false,
    withSkills: undefined,  // undefined = ask, true = install, false = skip
    skillsAgents: null,     // null = ask, array = use these agents
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dir' && argv[i + 1]) {
      args.dir = argv[++i];
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--with-skills') {
      args.withSkills = true;
    } else if (arg === '--no-skills') {
      args.withSkills = false;
    } else if (arg === '--skills-agents' && argv[i + 1]) {
      const agentList = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
      const validAgents = agentList.filter(a => SKILL_AGENTS[a]);
      args.skillsAgents = validAgents.length > 0 ? validAgents : null;
    }
  }
  return args;
}

function templates(packageName) {
  const pkg = {
    name: packageName,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      gen: 'bddgen',
      test: 'bddgen && playwright test',
      'clean:gen': 'rm -rf .features-gen',
      clean: 'rm -rf .features-gen node_modules test-results storage cucumber-report playwright-report'
    },
    devDependencies: {
      '@esimplicity/stack-tests': '^0.1.0',
      '@playwright/test': '^1.49.0',
      'playwright-bdd': '^8.3.0',
      dotenv: '^16.1.4',
      typescript: '^5.6.3'
    }
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2021',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      types: ['node', '@playwright/test']
    },
    include: ['features/**/*.ts', 'playwright.config.ts']
  };

  const fixturesTs = `import {
  createBddTest,
  PlaywrightApiAdapter,
  PlaywrightUiAdapter,
  UniversalAuthAdapter,
  DefaultCleanupAdapter,
  TuiTesterAdapter,
} from '@esimplicity/stack-tests';

export const test = createBddTest({
  createApi: ({ apiRequest }) => new PlaywrightApiAdapter(apiRequest),
  createUi: ({ page }) => new PlaywrightUiAdapter(page),
  createAuth: ({ api, ui }) => new UniversalAuthAdapter({ api, ui }),
  createCleanup: () => new DefaultCleanupAdapter(),
  // TUI testing (optional - requires tui-tester and tmux installed)
  // Uncomment and configure for your CLI application:
  // createTui: () => new TuiTesterAdapter({
  //   command: ['node', 'dist/cli.js'],
  //   size: { cols: 100, rows: 30 },
  //   debug: process.env.DEBUG === 'true',
  // }),
});
`;

  const stepsTs = `import { test } from './fixtures';
import {
  registerApiSteps,
  registerUiSteps,
  registerSharedSteps,
  registerHybridSuite,
  registerTuiSteps,
} from '@esimplicity/stack-tests/steps';

registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);
registerHybridSuite(test);

// TUI steps (optional - requires tui-tester and tmux installed)
// Uncomment when you have TUI testing configured:
// registerTuiSteps(test);

export { test };
`;

  const playwrightConfig = `import { defineConfig } from '@playwright/test';
import { defineBddProject, cucumberReporter } from 'playwright-bdd';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const apiBdd = defineBddProject({
  name: 'api',
  features: 'features/api/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@api',
});

const uiBdd = defineBddProject({
  name: 'ui',
  features: 'features/ui/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@ui',
});

const hybridBdd = defineBddProject({
  name: 'hybrid',
  features: 'features/hybrid/**/*.feature',
  steps: 'features/steps/**/*.ts',
  tags: '@hybrid',
});

// TUI project (optional - uncomment when TUI testing is configured)
// const tuiBdd = defineBddProject({
//   name: 'tui',
//   features: 'features/tui/**/*.feature',
//   steps: 'features/steps/**/*.ts',
//   tags: '@tui',
// });

export default defineConfig({
  reporter: [
    cucumberReporter('html', { outputFile: 'cucumber-report/index.html' }),
    cucumberReporter('json', { outputFile: 'cucumber-report/report.json' }),
  ],
  // Add tuiBdd to this array when TUI testing is enabled
  projects: [apiBdd, uiBdd, hybridBdd /* , tuiBdd */],
  use: {
    baseURL: process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
    headless: process.env.HEADLESS === 'false' ? false : true,
  },
});
`;

  const apiFeature = `Feature: API example
  As an API consumer
  I want to call the service
  So that I can verify responses

  @api
  Scenario: GET health
    When I GET "/health"
    Then the response status should be 200
`;

  const uiFeature = `Feature: UI example
  As a user
  I want to load the homepage
  So that I can see content

  @ui
  Scenario: Visit homepage
    Given I navigate to "/"
    Then the URL should contain "/"
`;

  const hybridFeature = `Feature: Hybrid example
  As a tester
  I want to mix API and UI steps
  So that I can cover flows end-to-end

  @hybrid
  Scenario: API then UI
    When I GET "/health"
    Then the response status should be 200
    Given I navigate to "/"
    Then the URL should contain "/"
`;

  const tuiFeature = `Feature: TUI example
  As a CLI user
  I want to interact with the terminal application
  So that I can verify TUI functionality

  @tui
  Scenario: Start and verify TUI application
    Given I start the TUI application
    Then I should see "Welcome"
    When I type "help"
    And I press enter
    Then I should see "Available commands"

  @tui
  Scenario: Navigate menu with keyboard
    Given I start the TUI application
    When I navigate down 2 times
    And I press enter
    Then I should see "Selected option"

  @tui
  Scenario: Fill form in TUI
    Given I start the TUI application
    When I enter "John Doe" in the "Name" field
    And I press tab
    And I enter "john@example.com" in the "Email" field
    And I submit the form
    Then I should see "Form submitted successfully"

  @tui
  Scenario: Verify screen snapshot
    Given I start the TUI application
    Then the screen should match snapshot "main-menu"
`;

  const gitignore = `node_modules
.features-gen
playwright-report
test-results
cucumber-report
storage
.env
`; 

  const envExample = `# API defaults used by the auth and cleanup helpers
DEFAULT_ADMIN_USERNAME=admin@prima.com
DEFAULT_ADMIN_PASSWORD=admin1234
API_AUTH_LOGIN_PATH=/auth/login
API_BASE_URL=http://localhost:4000

# UI defaults
FRONTEND_URL=http://localhost:3000
HEADLESS=true

# TUI testing (optional)
# Set DEBUG=true to see TUI tester output
DEBUG=false
`;

  const readme = `# stack-tests

Generated Playwright + BDD test package powered by @esimplicity/stack-tests.

## Install
- Install deps in this folder: (see commands printed by the generator)

## Run
- Generate tests: \
  \`npm run gen\`
- Run tests: \
  \`npm test\`

## Structure
- \`features/api|ui|hybrid|tui\`: feature files
- \`features/steps/steps.ts\`: registers steps from @esimplicity/stack-tests
- \`features/steps/fixtures.ts\`: creates the Playwright-BDD test with adapters
- \`playwright.config.ts\`: BDD-aware Playwright config with reporters

## Notes
- Edit \`playwright.config.ts\` projects/tags to match your repo.
- Keep @playwright/test and playwright-bdd versions aligned with @esimplicity/stack-tests peer ranges.

## TUI Testing (Optional)
To enable terminal user interface testing:

1. Install tmux (required by tui-tester):
   \`\`\`bash
   # macOS
   brew install tmux

   # Ubuntu/Debian
   apt-get install tmux
   \`\`\`

2. Install tui-tester:
   \`\`\`bash
   npm install tui-tester
   \`\`\`

3. Uncomment TUI configuration in:
   - \`features/steps/fixtures.ts\`: Configure TuiTesterAdapter with your CLI command
   - \`features/steps/steps.ts\`: Uncomment registerTuiSteps(test)
   - \`playwright.config.ts\`: Uncomment tuiBdd project and add to projects array

4. Write @tui tagged feature files in \`features/tui/\`
`;

  return {
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    'tsconfig.json': JSON.stringify(tsconfig, null, 2) + '\n',
    'playwright.config.ts': playwrightConfig,
    'features/steps/fixtures.ts': fixturesTs,
    'features/steps/steps.ts': stepsTs,
    'features/api/00_api_examples.feature': apiFeature,
    'features/ui/00_ui_examples.feature': uiFeature,
    'features/hybrid/00_hybrid_examples.feature': hybridFeature,
    'features/tui/00_tui_examples.feature': tuiFeature,
    '.gitignore': gitignore,
    '.env.example': envExample,
    'README.md': readme,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(process.cwd(), args.dir);
  const pm = commandsFor(await detectPackageManager(process.cwd()));
  const files = templates('stack-tests');

  const results = { created: [], skipped: [], skills: [] };
  await ensureDir(targetDir);

  for (const [rel, content] of Object.entries(files)) {
    const filePath = path.join(targetDir, rel);
    await writeFileSafe(filePath, content, { force: args.force, results });
  }

  console.log(`\nScaffold complete at ${targetDir}`);
  if (results.created.length) {
    console.log('Created files:');
    results.created.forEach((f) => console.log(`  + ${path.relative(process.cwd(), f)}`));
  }
  if (results.skipped.length) {
    console.log('Skipped existing files (use --force to overwrite):');
    results.skipped.forEach((f) => console.log(`  ~ ${path.relative(process.cwd(), f)}`));
  }

  // Skills installation
  let installSkills = args.withSkills;
  if (installSkills === undefined) {
    // Interactive mode - ask user
    installSkills = await promptYesNo('\nWould you like to install Katalyst BDD Agent Skills?');
  }

  if (installSkills) {
    let agents = args.skillsAgents;
    if (!agents) {
      // Interactive mode - ask which agents
      const agentOptions = Object.entries(SKILL_AGENT_LABELS).map(([key, label]) => ({ key, label }));
      agents = await promptMultiSelect('Select agents to install skills to:', agentOptions);
    }

    console.log('\nInstalling skills...');
    await copySkillsToAgents(targetDir, agents, results);

    if (results.skills.length) {
      console.log('Installed skills to:');
      // Group by agent directory
      const byAgent = {};
      for (const skillPath of results.skills) {
        const parts = skillPath.split(path.sep);
        const agentDir = parts.slice(0, -1).join(path.sep);
        if (!byAgent[agentDir]) byAgent[agentDir] = [];
        byAgent[agentDir].push(parts[parts.length - 1]);
      }
      for (const [agentDir, skillNames] of Object.entries(byAgent)) {
        console.log(`  ${agentDir}/`);
        skillNames.forEach(name => console.log(`    + ${name}/`));
      }
    }
  }

  console.log('\nNext steps:');
  console.log(`  1) cd ${path.relative(process.cwd(), targetDir) || '.'}`);
  console.log(`  2) ${pm.install}`);
  console.log(`  3) ${pm.test}`);
  
  if (results.skills.length) {
    console.log('\nSkills installed! Your AI agent can now help you:');
    console.log('  - Create BDD tests with katalyst-bdd-create-test');
    console.log('  - Look up step definitions with katalyst-bdd-step-reference');
    console.log('  - Debug issues with katalyst-bdd-troubleshooting');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
