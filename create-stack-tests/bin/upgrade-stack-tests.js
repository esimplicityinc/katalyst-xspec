#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const PACKAGE_NAME = '@esimplicity/stack-tests';
const NPM_PACKAGE_NAME = '@esimplicity/stack-tests';

// Agent skill directories configuration
const SKILL_AGENTS = {
  'opencode': '.opencode/skills',
  'claude-code': '.claude/skills',
  'cursor': '.cursor/skills',
  'generic': 'skills',
};

function log(msg) {
  console.log(`[upgrade-stack-tests] ${msg}`);
}

function error(msg) {
  console.error(`[upgrade-stack-tests] ERROR: ${msg}`);
}

function detectPackageManager(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'bun.lockb'))) return 'bun';
    if (fs.existsSync(path.join(dir, 'bun.lock'))) return 'bun';
    if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'npm';
}

function getInstalledVersion(cwd) {
  const pkgPath = path.join(cwd, 'node_modules', PACKAGE_NAME, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    // Try npm scoped name
    const npmPkgPath = path.join(cwd, 'node_modules', NPM_PACKAGE_NAME, 'package.json');
    if (fs.existsSync(npmPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(npmPkgPath, 'utf8'));
      return { version: pkg.version, name: NPM_PACKAGE_NAME };
    }
    return null;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return { version: pkg.version, name: PACKAGE_NAME };
}

function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

function runUpgrade(pm, packageName, targetVersion) {
  const versionSpec = targetVersion ? `${packageName}@${targetVersion}` : packageName;
  
  const commands = {
    npm: ['npm', 'install', versionSpec],
    bun: ['bun', 'add', versionSpec],
    pnpm: ['pnpm', 'add', versionSpec],
    yarn: ['yarn', 'add', versionSpec],
  };
  
  const [cmd, ...args] = commands[pm] || commands.npm;
  
  log(`Running: ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  
  return result.status === 0;
}

function parseArgs(args) {
  const options = {
    check: false,
    version: null,
    help: false,
    updateSkills: false,
    migrate: false,
    dryRun: false,
    backupDir: null,
    interactive: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check' || arg === '-c') {
      options.check = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--update-skills' || arg === '--skills') {
      options.updateSkills = true;
    } else if (arg === '--migrate') {
      options.migrate = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--backup-dir' && args[i + 1]) {
      options.backupDir = args[++i];
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Usage: npx upgrade-stack-tests [options]

Upgrade @esimplicity/stack-tests to the latest version.

Options:
  -c, --check           Check for updates without installing
  -v, --version VER     Install a specific version
  --update-skills       Update installed Agent Skills to latest version
  --migrate             Migrate scaffolding (backup, update, restore custom files)
  --dry-run             Show what would change without making changes
  --backup-dir <dir>    Custom backup directory (default: /tmp/stack-tests-backup-<timestamp>)
  -i, --interactive     Interactive mode with prompts
  -h, --help            Show this help message

Examples:
  npx upgrade-stack-tests                    # Upgrade to latest
  npx upgrade-stack-tests --check            # Check for updates only
  npx upgrade-stack-tests -v 0.1.1           # Install specific version
  npx upgrade-stack-tests --update-skills    # Update skills only
  npx upgrade-stack-tests --migrate          # Full scaffolding migration
  npx upgrade-stack-tests --migrate --dry-run # Preview migration changes
  npx upgrade-stack-tests -i                 # Interactive mode
`);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findInstalledSkillDirs(cwd) {
  const foundDirs = [];
  
  for (const [agent, relPath] of Object.entries(SKILL_AGENTS)) {
    const fullPath = path.join(cwd, relPath);
    if (fs.existsSync(fullPath)) {
      // Check if it contains katalyst skills
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      const hasKatalystSkills = entries.some(e => 
        e.isDirectory() && e.name.startsWith('katalyst-bdd-')
      );
      if (hasKatalystSkills) {
        foundDirs.push({ agent, path: fullPath, relPath });
      }
    }
  }
  
  return foundDirs;
}

function updateSkills(cwd) {
  const skillsSourceDir = path.join(__dirname, '..', 'skills');
  
  if (!fs.existsSync(skillsSourceDir)) {
    error('Skills source directory not found in package');
    return false;
  }
  
  const installedDirs = findInstalledSkillDirs(cwd);
  
  if (installedDirs.length === 0) {
    log('No Katalyst BDD skills found in current directory.');
    log('Skills can be installed with: npx create-stack-tests --with-skills');
    return true;
  }
  
  log(`Found skills in ${installedDirs.length} location(s):`);
  installedDirs.forEach(d => log(`  - ${d.relPath}`));
  
  const skillDirs = fs.readdirSync(skillsSourceDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  let updated = 0;
  for (const { agent, path: agentSkillsPath, relPath } of installedDirs) {
    log(`Updating skills in ${relPath}...`);
    
    for (const skill of skillDirs) {
      const srcSkillDir = path.join(skillsSourceDir, skill);
      const destSkillDir = path.join(agentSkillsPath, skill);
      
      // Remove existing and copy fresh
      if (fs.existsSync(destSkillDir)) {
        fs.rmSync(destSkillDir, { recursive: true, force: true });
      }
      copyDirSync(srcSkillDir, destSkillDir);
      updated++;
    }
  }
  
  log(`Updated ${updated} skill(s) across ${installedDirs.length} agent(s).`);
  return true;
}

// =============================================================================
// MIGRATION FUNCTIONALITY
// =============================================================================

/**
 * Find custom step files (any *-steps.ts that's not the main steps.ts)
 */
function findCustomStepFiles(stepsDir) {
  if (!fs.existsSync(stepsDir)) return [];
  
  const files = fs.readdirSync(stepsDir);
  return files.filter(f => 
    f.endsWith('-steps.ts') || 
    f.endsWith('-steps.js') ||
    (f.endsWith('.ts') && f !== 'steps.ts' && f !== 'fixtures.ts')
  );
}

/**
 * Find all feature files
 */
function findFeatureFiles(featuresDir) {
  const results = [];
  
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'steps' && !entry.name.startsWith('.')) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.feature')) {
        results.push(fullPath);
      }
    }
  }
  
  walk(featuresDir);
  return results;
}

/**
 * Extract custom imports from steps.ts
 */
function extractCustomImports(stepsContent) {
  const lines = stepsContent.split('\n');
  const customImports = [];
  
  for (const line of lines) {
    // Match local imports that aren't fixtures or from the library
    if (line.match(/^import\s+.*from\s+['"]\.\/(?!fixtures)/) ||
        line.match(/^import\s+['"]\.\/(?!fixtures)/)) {
      customImports.push(line);
    }
  }
  
  return customImports;
}

/**
 * Extract cleanup rules from fixtures.ts
 */
function extractCleanupRules(fixturesContent) {
  // Look for DefaultCleanupAdapter configuration
  const match = fixturesContent.match(/new\s+DefaultCleanupAdapter\s*\(\s*\{([^}]+)\}\s*\)/s);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Merge package.json - preserve user's custom dependencies/scripts
 */
function mergePackageJson(existing, template) {
  const existingPkg = JSON.parse(existing);
  const templatePkg = JSON.parse(template);
  
  // Keep user's name, version, description
  const merged = {
    ...templatePkg,
    name: existingPkg.name || templatePkg.name,
    version: existingPkg.version || templatePkg.version,
    description: existingPkg.description || templatePkg.description,
  };
  
  // Merge scripts - keep custom scripts, update standard ones
  merged.scripts = {
    ...existingPkg.scripts,
    ...templatePkg.scripts,
  };
  
  // Merge dependencies - update template deps, keep custom ones
  merged.devDependencies = {
    ...existingPkg.devDependencies,
    ...templatePkg.devDependencies,
  };
  
  if (existingPkg.dependencies) {
    merged.dependencies = existingPkg.dependencies;
  }
  
  return JSON.stringify(merged, null, 2) + '\n';
}

/**
 * Merge steps.ts - add new registrations, preserve custom imports
 */
function mergeStepsTs(existing, template, customImports) {
  // Start with the template
  let merged = template;
  
  // Add custom imports after the library imports
  if (customImports.length > 0) {
    const importEndMatch = merged.match(/from '@esimplicity\/stack-tests\/steps';/);
    if (importEndMatch) {
      const insertPos = merged.indexOf(importEndMatch[0]) + importEndMatch[0].length;
      const customImportBlock = '\n\n// Custom step imports (preserved from migration)\n' + 
        customImports.join('\n');
      merged = merged.slice(0, insertPos) + customImportBlock + merged.slice(insertPos);
    }
  }
  
  return merged;
}

/**
 * Merge fixtures.ts - preserve cleanup rules
 */
function mergeFixturesTs(existing, template, cleanupRules) {
  if (!cleanupRules) {
    return template;
  }
  
  // Replace DefaultCleanupAdapter() with DefaultCleanupAdapter({ preservedRules })
  return template.replace(
    /new\s+DefaultCleanupAdapter\s*\(\s*\)/,
    `new DefaultCleanupAdapter({\n    ${cleanupRules}\n  })`
  );
}

/**
 * Get fresh templates (imported from create-stack-tests logic)
 */
function getTemplates() {
  const pkg = {
    name: 'stack-tests',
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      gen: 'bddgen',
      test: 'bddgen && playwright test',
      'gen:stubs': 'generate-step-stubs',
      'clean:gen': 'rm -rf .features-gen',
      clean: 'rm -rf .features-gen node_modules test-results storage cucumber-report playwright-report'
    },
    devDependencies: {
      '@esimplicity/stack-tests': '^0.2.0',
      '@playwright/test': '^1.49.0',
      'playwright-bdd': '^8.3.0',
      dotenv: '^16.1.4',
      typescript: '^5.6.3'
    }
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

  const stepsTs = `import { test } from './fixtures.js';
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

  return {
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    'features/steps/fixtures.ts': fixturesTs,
    'features/steps/steps.ts': stepsTs,
  };
}

/**
 * Perform migration
 */
async function migrate(cwd, options) {
  const featuresDir = path.join(cwd, 'features');
  const stepsDir = path.join(cwd, 'features', 'steps');
  const backupDir = options.backupDir || 
    path.join(os.tmpdir(), `stack-tests-backup-${Date.now()}`);
  
  const results = {
    backed: [],
    updated: [],
    preserved: [],
    errors: [],
  };
  
  log('Starting migration...');
  log(`Backup directory: ${backupDir}`);
  console.log('');
  
  // =========================================================================
  // PHASE 1: DETECT CUSTOM FILES
  // =========================================================================
  log('Phase 1: Detecting custom files...');
  
  const customStepFiles = findCustomStepFiles(stepsDir);
  const featureFiles = findFeatureFiles(featuresDir);
  const envFile = fs.existsSync(path.join(cwd, '.env')) ? '.env' : null;
  const envExampleFile = fs.existsSync(path.join(cwd, '.env.example')) ? '.env.example' : null;
  
  // Read existing files for analysis
  let existingStepsTs = '';
  let existingFixturesTs = '';
  let existingPackageJson = '';
  
  if (fs.existsSync(path.join(stepsDir, 'steps.ts'))) {
    existingStepsTs = fs.readFileSync(path.join(stepsDir, 'steps.ts'), 'utf8');
  }
  if (fs.existsSync(path.join(stepsDir, 'fixtures.ts'))) {
    existingFixturesTs = fs.readFileSync(path.join(stepsDir, 'fixtures.ts'), 'utf8');
  }
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    existingPackageJson = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8');
  }
  
  const customImports = extractCustomImports(existingStepsTs);
  const cleanupRules = extractCleanupRules(existingFixturesTs);
  
  console.log('  Custom step files found:', customStepFiles.length > 0 ? customStepFiles.join(', ') : 'none');
  console.log('  Feature files found:', featureFiles.length);
  console.log('  Custom imports in steps.ts:', customImports.length);
  console.log('  Custom cleanup rules:', cleanupRules ? 'yes' : 'no');
  console.log('  Environment files:', [envFile, envExampleFile].filter(Boolean).join(', ') || 'none');
  console.log('');
  
  // =========================================================================
  // PHASE 2: BACKUP
  // =========================================================================
  log('Phase 2: Backing up custom files...');
  
  if (!options.dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup custom step files
    for (const file of customStepFiles) {
      const src = path.join(stepsDir, file);
      const dest = path.join(backupDir, 'steps', file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      results.backed.push(`steps/${file}`);
    }
    
    // Backup feature files
    for (const featureFile of featureFiles) {
      const relPath = path.relative(cwd, featureFile);
      const dest = path.join(backupDir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(featureFile, dest);
      results.backed.push(relPath);
    }
    
    // Backup env files
    if (envFile) {
      fs.copyFileSync(path.join(cwd, envFile), path.join(backupDir, envFile));
      results.backed.push(envFile);
    }
    if (envExampleFile) {
      fs.copyFileSync(path.join(cwd, envExampleFile), path.join(backupDir, envExampleFile));
      results.backed.push(envExampleFile);
    }
    
    // Backup original steps.ts and fixtures.ts for reference
    if (existingStepsTs) {
      fs.writeFileSync(path.join(backupDir, 'steps', 'steps.ts.original'), existingStepsTs);
    }
    if (existingFixturesTs) {
      fs.writeFileSync(path.join(backupDir, 'steps', 'fixtures.ts.original'), existingFixturesTs);
    }
  }
  
  console.log(`  Backed up ${results.backed.length} files`);
  if (options.dryRun) {
    console.log('  (dry run - no files actually backed up)');
  }
  console.log('');
  
  // =========================================================================
  // PHASE 3: MERGE AND UPDATE
  // =========================================================================
  log('Phase 3: Merging configurations...');
  
  const templates = getTemplates();
  const filesToUpdate = {};
  
  // Merge package.json
  if (existingPackageJson) {
    filesToUpdate['package.json'] = mergePackageJson(existingPackageJson, templates['package.json']);
    console.log('  package.json: merged (preserving custom scripts/dependencies)');
  }
  
  // Merge steps.ts
  filesToUpdate['features/steps/steps.ts'] = mergeStepsTs(
    existingStepsTs, 
    templates['features/steps/steps.ts'],
    customImports
  );
  console.log(`  steps.ts: merged (${customImports.length} custom imports preserved)`);
  
  // Merge fixtures.ts
  filesToUpdate['features/steps/fixtures.ts'] = mergeFixturesTs(
    existingFixturesTs,
    templates['features/steps/fixtures.ts'],
    cleanupRules
  );
  console.log(`  fixtures.ts: merged (cleanup rules ${cleanupRules ? 'preserved' : 'using defaults'})`);
  console.log('');
  
  // =========================================================================
  // PHASE 4: WRITE UPDATED FILES
  // =========================================================================
  log('Phase 4: Writing updated files...');
  
  if (!options.dryRun) {
    for (const [relPath, content] of Object.entries(filesToUpdate)) {
      const fullPath = path.join(cwd, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
      results.updated.push(relPath);
    }
  }
  
  console.log(`  Updated ${Object.keys(filesToUpdate).length} files`);
  if (options.dryRun) {
    console.log('  (dry run - no files actually written)');
  }
  console.log('');
  
  // =========================================================================
  // PHASE 5: VERIFY PRESERVED FILES
  // =========================================================================
  log('Phase 5: Verifying preserved files...');
  
  // Custom step files should still exist (we didn't touch them)
  for (const file of customStepFiles) {
    const fullPath = path.join(stepsDir, file);
    if (fs.existsSync(fullPath)) {
      results.preserved.push(`steps/${file}`);
    }
  }
  
  // Feature files should still exist (we didn't touch them)
  for (const featureFile of featureFiles) {
    const relPath = path.relative(cwd, featureFile);
    if (fs.existsSync(featureFile)) {
      results.preserved.push(relPath);
    }
  }
  
  // Env files should still exist (we didn't touch them)
  if (envFile && fs.existsSync(path.join(cwd, envFile))) {
    results.preserved.push(envFile);
  }
  
  console.log(`  ${results.preserved.length} files preserved`);
  console.log('');
  
  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('═'.repeat(60));
  console.log('Migration Summary');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Backup location: ${backupDir}`);
  console.log('');
  console.log('Updated files:');
  for (const file of results.updated) {
    console.log(`  ~ ${file}`);
  }
  console.log('');
  console.log('Preserved files:');
  if (results.preserved.length <= 10) {
    for (const file of results.preserved) {
      console.log(`  ✓ ${file}`);
    }
  } else {
    for (const file of results.preserved.slice(0, 5)) {
      console.log(`  ✓ ${file}`);
    }
    console.log(`  ... and ${results.preserved.length - 5} more`);
  }
  console.log('');
  
  if (options.dryRun) {
    console.log('This was a dry run. No files were actually modified.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('Next steps:');
    console.log('  1) Review changes to package.json, steps.ts, fixtures.ts');
    console.log('  2) Run: npm install (or your package manager)');
    console.log('  3) Run: npm run gen');
    console.log('  4) Run: npm test');
    console.log('');
    console.log(`If something went wrong, restore from: ${backupDir}`);
  }
  
  return results;
}

// =============================================================================
// INTERACTIVE MODE
// =============================================================================

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

async function interactiveMode(cwd) {
  console.log('');
  console.log('═'.repeat(60));
  console.log('Stack Tests Interactive Upgrade');
  console.log('═'.repeat(60));
  console.log('');
  
  const pm = detectPackageManager(cwd);
  const installed = getInstalledVersion(cwd);
  const latest = installed ? getLatestVersion(installed.name) : null;
  
  console.log(`Package manager: ${pm}`);
  if (installed) {
    console.log(`Current version: ${installed.version}`);
  }
  if (latest) {
    console.log(`Latest version:  ${latest}`);
  }
  console.log('');
  
  // Check for updates
  if (installed && latest && installed.version !== latest) {
    const doUpgrade = await promptYesNo(`Upgrade ${installed.name} from ${installed.version} to ${latest}?`);
    if (doUpgrade) {
      const success = runUpgrade(pm, installed.name, latest);
      if (!success) {
        error('Upgrade failed');
        return;
      }
      log('Package upgraded successfully!');
      console.log('');
    }
  } else if (installed) {
    log('Package is already up to date.');
    console.log('');
  }
  
  // Ask about migration
  const doMigrate = await promptYesNo('Would you like to migrate scaffolding files (steps.ts, fixtures.ts, package.json)?');
  if (doMigrate) {
    const dryRunFirst = await promptYesNo('Would you like to preview changes first (dry run)?');
    if (dryRunFirst) {
      await migrate(cwd, { dryRun: true });
      console.log('');
      const proceed = await promptYesNo('Apply these changes?');
      if (proceed) {
        await migrate(cwd, { dryRun: false });
      }
    } else {
      await migrate(cwd, { dryRun: false });
    }
  }
  
  // Ask about skills
  const installedSkills = findInstalledSkillDirs(cwd);
  if (installedSkills.length > 0) {
    const updateSkillsChoice = await promptYesNo('Would you like to update AI Agent Skills?');
    if (updateSkillsChoice) {
      updateSkills(cwd);
    }
  }
  
  console.log('');
  log('Interactive upgrade complete!');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  const cwd = process.cwd();
  
  // Interactive mode
  if (options.interactive) {
    await interactiveMode(cwd);
    process.exit(0);
  }
  
  // Handle --migrate
  if (options.migrate) {
    log('Starting scaffolding migration...');
    await migrate(cwd, options);
    process.exit(0);
  }
  
  // Handle --update-skills separately
  if (options.updateSkills) {
    log('Updating Katalyst BDD Agent Skills...');
    const success = updateSkills(cwd);
    process.exit(success ? 0 : 1);
  }
  
  const pm = detectPackageManager(cwd);
  
  log(`Detected package manager: ${pm}`);
  
  // Check installed version
  const installed = getInstalledVersion(cwd);
  if (!installed) {
    error(`${PACKAGE_NAME} is not installed in this project.`);
    log(`Run: ${pm === 'npm' ? 'npm install' : pm + ' add'} ${PACKAGE_NAME}`);
    process.exit(1);
  }
  
  log(`Installed: ${installed.name}@${installed.version}`);
  
  // Get latest version
  const latest = getLatestVersion(installed.name);
  if (!latest) {
    error(`Could not fetch latest version from registry.`);
    process.exit(1);
  }
  
  const targetVersion = options.version || latest;
  log(`Latest available: ${latest}`);
  
  if (options.version) {
    log(`Target version: ${options.version}`);
  }
  
  // Compare versions
  if (installed.version === targetVersion) {
    log(`Already up to date!`);
    process.exit(0);
  }
  
  if (options.check) {
    log(`Update available: ${installed.version} -> ${targetVersion}`);
    log(`Run without --check to upgrade.`);
    process.exit(0);
  }
  
  // Perform upgrade
  log(`Upgrading: ${installed.version} -> ${targetVersion}`);
  const success = runUpgrade(pm, installed.name, targetVersion);
  
  if (success) {
    log(`Successfully upgraded to ${targetVersion}!`);
  } else {
    error(`Upgrade failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
