#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = '@esimplicityinc/stack-tests';
const NPM_PACKAGE_NAME = '@esimplicity/stack-tests';

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
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check' || arg === '-c') {
      options.check = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Usage: npx upgrade-stack-tests [options]

Upgrade @esimplicityinc/stack-tests to the latest version.

Options:
  -c, --check        Check for updates without installing
  -v, --version VER  Install a specific version
  -h, --help         Show this help message

Examples:
  npx upgrade-stack-tests              # Upgrade to latest
  npx upgrade-stack-tests --check      # Check for updates only
  npx upgrade-stack-tests -v 0.1.1     # Install specific version
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  const cwd = process.cwd();
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
