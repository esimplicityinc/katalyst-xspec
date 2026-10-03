'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'bin', 'katalyst-xspec.cjs');
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });

describe('katalyst-xspec CLI dispatcher', () => {
  it('prints usage listing init, upgrade and stubs with no arguments', () => {
    const r = run();
    assert.equal(r.status, 0);
    for (const cmd of ['init', 'upgrade', 'stubs']) assert.match(r.stdout, new RegExp(`\\b${cmd}\\b`));
  });

  it('exits non-zero on an unknown command', () => {
    const r = run('nope');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Unknown command: nope/);
  });

  it('prints the package version with --version', () => {
    const r = run('--version');
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), require('../package.json').version);
  });

  it('forwards remaining args to the subcommand (upgrade --help)', () => {
    const r = run('upgrade', '--help');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /katalyst-xspec upgrade/);
  });
});

describe('katalyst-xspec init', () => {
  const fs = require('node:fs');
  const os = require('node:os');

  function scaffold(...args) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-init-'));
    const r = spawnSync(process.execPath, [BIN, 'init', ...args, '--no-skills'], { cwd, encoding: 'utf8' });
    return { cwd, r };
  }
  const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

  it('accepts the target directory positionally and names the project after it', () => {
    const { cwd, r } = scaffold('my-tests');
    try {
      assert.equal(r.status, 0, r.stderr);
      const pkg = JSON.parse(read(cwd, 'my-tests', 'package.json'));
      assert.equal(pkg.name, 'my-tests');
      assert.equal(pkg.scripts['gen:stubs'], 'katalyst-xspec stubs');
      assert.equal(pkg.scripts.upgrade, 'katalyst-xspec upgrade');
      assert.ok(pkg.devDependencies['@esimplicitylabs/katalyst-xspec']);
      // Published on npmjs.com: no registry mapping or token needed.
      assert.equal(fs.existsSync(path.join(cwd, 'my-tests', '.npmrc')), false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('init . uses the current folder name, made npm-safe', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-init-'));
    const cwd = path.join(parent, 'My Demo_Project');
    fs.mkdirSync(cwd);
    try {
      const r = spawnSync(process.execPath, [BIN, 'init', '.', '--no-skills'], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(read(cwd, 'package.json')).name, 'my-demo_project');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('scaffolds folder-based projects with no @api/@ui/@hybrid/@tui type tags', () => {
    const { cwd, r } = scaffold('t');
    try {
      assert.equal(r.status, 0, r.stderr);
      const config = read(cwd, 't', 'playwright.config.ts');
      assert.doesNotMatch(config, /@(api|ui|hybrid|tui)\b/);
      assert.match(config, /features: 'features\/api\/\*\*\/\*\.feature'/);
      assert.match(config, /features: 'features\/ui\/\*\*\/\*\.feature'/);
      assert.match(config, /resolveExtraTags\(process\.env\.TEST_TAGS\)/);
      for (const f of ['features/api/example.feature', 'features/ui/example.feature']) {
        assert.doesNotMatch(read(cwd, 't', f), /@(api|ui|hybrid|tui)\b/, f);
      }
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('config resolves and logs targets; .env.example documents URLs and role-based auth', () => {
    const { cwd, r } = scaffold('t');
    try {
      assert.equal(r.status, 0, r.stderr);
      const config = read(cwd, 't', 'playwright.config.ts');
      assert.match(config, /const targets = logTargets\(resolveTargets\(\)\)/);
      assert.match(config, /baseURL: targets\.frontendUrl/);
      const env = read(cwd, 't', '.env.example');
      for (const key of ['FRONTEND_URL', 'API_BASE_URL', 'AUTH_ADMIN_USERNAME', 'AUTH_ADMIN_PASSWORD', 'API_AUTH_BODY', 'API_AUTH_TOKEN_PATH', 'UI_LOGIN_PATH', 'UI_SESSION_REUSE']) {
        assert.match(env, new RegExp(key), key);
      }
      assert.doesNotMatch(env, /DEFAULT_ADMIN_/);
      assert.match(read(cwd, 't', 'features/steps/fixtures.ts'), /roles:/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('example features target public sites, so a fresh project passes without a .env', () => {
    const { cwd, r } = scaffold('t');
    try {
      assert.equal(r.status, 0, r.stderr);
      assert.match(read(cwd, 't', 'features/api/example.feature'), /When I GET "https:\/\/jsonplaceholder\.typicode\.com\//);
      assert.match(read(cwd, 't', 'features/ui/example.feature'), /Given I navigate to "https:\/\/www\.saucedemo\.com\/"/);
      // Examples that need extra setup are no longer scaffolded.
      assert.equal(fs.existsSync(path.join(cwd, 't', 'features/hybrid')), false);
      assert.equal(fs.existsSync(path.join(cwd, 't', 'features/tui')), false);
      assert.match(r.stdout, /npx playwright install chromium/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('katalyst-xspec upgrade --migrate', () => {
  const fs = require('node:fs');
  const os = require('node:os');

  it('migrates a freshly scaffolded project (no custom step files) and strips type-tag filters', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-migrate-'));
    try {
      assert.equal(spawnSync(process.execPath, [BIN, 'init', '.', '--no-skills'], { cwd, encoding: 'utf8' }).status, 0);
      // Simulate a pre-0.7 config.
      const cfg = path.join(cwd, 'playwright.config.ts');
      fs.writeFileSync(cfg, fs.readFileSync(cfg, 'utf8').replace("name: 'ui',", "name: 'ui',\n  tags: '@ui',"));
      const backupDir = path.join(cwd, '.backup');
      const r = spawnSync(process.execPath, [BIN, 'upgrade', '--migrate', '--backup-dir', backupDir], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.doesNotMatch(fs.readFileSync(cfg, 'utf8'), /tags: '@ui'/);
      assert.ok(fs.existsSync(path.join(backupDir, 'steps', 'steps.ts.original')));
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('katalyst-xspec upgrade --migrate keeps customised fixtures', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  it('does not overwrite a fixtures.ts that wires a custom auth adapter', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-migrate-fx-'));
    try {
      assert.equal(spawnSync(process.execPath, [BIN, 'init', '.', '--no-skills'], { cwd, encoding: 'utf8' }).status, 0);
      const fx = path.join(cwd, 'features', 'steps', 'fixtures.ts');
      const custom = fs.readFileSync(fx, 'utf8').replace('new UniversalAuthAdapter({ api, ui, roles: {} })', 'new MyAuth({ api, ui })');
      fs.writeFileSync(fx, custom);
      const r = spawnSync(process.execPath, [BIN, 'upgrade', '--migrate', '--backup-dir', path.join(cwd, '.bk')], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(fs.readFileSync(fx, 'utf8'), custom);
      assert.match(r.stdout, /fixtures\.ts: kept/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('katalyst-xspec init --help', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  it('prints usage and does not scaffold anything', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-help-'));
    try {
      const r = spawnSync(process.execPath, [BIN, 'init', '--help'], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /katalyst-xspec init \[dir\]/);
      assert.match(r.stdout, /--with-skills/);
      assert.deepEqual(fs.readdirSync(cwd), []);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
