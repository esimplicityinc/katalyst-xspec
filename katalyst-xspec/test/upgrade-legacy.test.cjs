'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  LEGACY_PACKAGE_NAME,
  PACKAGE_NAME,
  GITHUB_PACKAGES_NPMRC_LINE,
  getInstalledVersion,
  rewriteLegacyImports,
  ensureGithubPackagesNpmrc,
  mergePackageJson,
  rewriteLegacyScripts,
} = require('../cli/upgrade.cjs');

function write(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe('upgrade-katalyst-xspec: legacy @esimplicity/stack-tests projects', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-upgrade-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('uses the new package name and the GitHub Packages scope', () => {
    assert.equal(PACKAGE_NAME, '@esimplicityinc/katalyst-xspec');
    assert.equal(LEGACY_PACKAGE_NAME, '@esimplicity/stack-tests');
    assert.equal(GITHUB_PACKAGES_NPMRC_LINE, '@esimplicityinc:registry=https://npm.pkg.github.com');
  });

  it('detects an installed legacy package and flags it', () => {
    write(dir, 'node_modules/@esimplicity/stack-tests/package.json', JSON.stringify({ version: '0.3.0' }));
    assert.deepEqual(getInstalledVersion(dir), { version: '0.3.0', name: LEGACY_PACKAGE_NAME, legacy: true });
  });

  it('prefers the new package when both are installed', () => {
    write(dir, 'node_modules/@esimplicity/stack-tests/package.json', JSON.stringify({ version: '0.3.0' }));
    write(dir, 'node_modules/@esimplicityinc/katalyst-xspec/package.json', JSON.stringify({ version: '0.4.0' }));
    assert.deepEqual(getInstalledVersion(dir), { version: '0.4.0', name: PACKAGE_NAME, legacy: false });
  });

  it('rewrites legacy import specifiers (root and /steps) in features and playwright config only', () => {
    write(dir, 'features/steps/steps.ts', "import { a } from '@esimplicity/stack-tests/steps';\nimport { b } from \"@esimplicity/stack-tests\";\n");
    write(dir, 'features/steps/custom/my.ts', "export * from '@esimplicity/stack-tests';\n");
    write(dir, 'playwright.config.ts', "import { resolveWorkers } from '@esimplicity/stack-tests';\n");
    write(dir, 'features/untouched.ts', "import x from '@esimplicity/stack-tests-other';\n");
    write(dir, 'node_modules/foo/index.ts', "import '@esimplicity/stack-tests';\n");

    const changed = rewriteLegacyImports(dir).sort();

    assert.deepEqual(changed, ['features/steps/custom/my.ts', 'features/steps/steps.ts', 'playwright.config.ts']);
    assert.equal(
      fs.readFileSync(path.join(dir, 'features/steps/steps.ts'), 'utf8'),
      "import { a } from '@esimplicityinc/katalyst-xspec/steps';\nimport { b } from \"@esimplicityinc/katalyst-xspec\";\n",
    );
    assert.equal(fs.readFileSync(path.join(dir, 'features/untouched.ts'), 'utf8'), "import x from '@esimplicity/stack-tests-other';\n");
    assert.equal(fs.readFileSync(path.join(dir, 'node_modules/foo/index.ts'), 'utf8'), "import '@esimplicity/stack-tests';\n");
  });

  it('dry-run reports files but does not modify them', () => {
    write(dir, 'playwright.config.ts', "import { resolveWorkers } from '@esimplicity/stack-tests';\n");
    assert.deepEqual(rewriteLegacyImports(dir, { dryRun: true }), ['playwright.config.ts']);
    assert.match(fs.readFileSync(path.join(dir, 'playwright.config.ts'), 'utf8'), /@esimplicity\/stack-tests/);
  });

  it('adds the GitHub Packages scope to .npmrc once, preserving existing lines', () => {
    write(dir, '.npmrc', 'save-exact=true');
    assert.equal(ensureGithubPackagesNpmrc(dir), true);
    assert.equal(ensureGithubPackagesNpmrc(dir), false);
    assert.equal(fs.readFileSync(path.join(dir, '.npmrc'), 'utf8'), `save-exact=true\n${GITHUB_PACKAGES_NPMRC_LINE}\n`);
  });

  it('creates .npmrc when missing', () => {
    assert.equal(ensureGithubPackagesNpmrc(dir), true);
    assert.equal(fs.readFileSync(path.join(dir, '.npmrc'), 'utf8'), `${GITHUB_PACKAGES_NPMRC_LINE}\n`);
  });

  it('migrate package.json merge drops the legacy dependency', () => {
    const existing = JSON.stringify({
      name: 'my-tests',
      devDependencies: { '@esimplicity/stack-tests': '^0.3.0', zod: '^3.0.0' },
    });
    const template = JSON.stringify({ devDependencies: { '@esimplicityinc/katalyst-xspec': '^0.4.0' } });
    const merged = JSON.parse(mergePackageJson(existing, template));
    assert.deepEqual(merged.devDependencies, { zod: '^3.0.0', '@esimplicityinc/katalyst-xspec': '^0.4.0' });
  });
});

describe('rewriteLegacyScripts', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-scripts-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('points old per-package CLI names at the single katalyst-xspec command', () => {
    write(dir, 'package.json', JSON.stringify({
      name: 'p',
      scripts: {
        'gen:stubs': 'generate-step-stubs',
        'check-updates': 'npx upgrade-stack-tests --check',
        upgrade: 'npx upgrade-katalyst-xspec',
        'upgrade:migrate': 'upgrade-katalyst-xspec --migrate',
        test: 'bddgen && playwright test',
      },
    }, null, 2) + '\n');

    assert.equal(rewriteLegacyScripts(dir), true);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.scripts, {
      'gen:stubs': 'katalyst-xspec stubs',
      'check-updates': 'katalyst-xspec upgrade --check',
      upgrade: 'katalyst-xspec upgrade',
      'upgrade:migrate': 'katalyst-xspec upgrade --migrate',
      test: 'bddgen && playwright test',
    });
    assert.equal(rewriteLegacyScripts(dir), false, 'second run is a no-op');
  });

  it('is a no-op without package.json or scripts', () => {
    assert.equal(rewriteLegacyScripts(dir), false);
    write(dir, 'package.json', '{"name":"p"}');
    assert.equal(rewriteLegacyScripts(dir), false);
  });
});
