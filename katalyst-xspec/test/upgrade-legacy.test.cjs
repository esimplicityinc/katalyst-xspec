'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  LEGACY_PACKAGE_NAMES,
  PACKAGE_NAME,
  getInstalledVersion,
  rewriteLegacyImports,
  removeGithubPackagesNpmrc,
  mergePackageJson,
  rewriteLegacyScripts,
} = require('../cli/upgrade.cjs');

function write(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe('upgrade: legacy package names', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-upgrade-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('publishes as @esimplicitylabs/katalyst-xspec and knows both old names', () => {
    assert.equal(PACKAGE_NAME, '@esimplicitylabs/katalyst-xspec');
    assert.deepEqual(LEGACY_PACKAGE_NAMES, ['@esimplicityinc/katalyst-xspec', '@esimplicity/stack-tests']);
  });

  for (const legacy of ['@esimplicityinc/katalyst-xspec', '@esimplicity/stack-tests']) {
    it(`detects an installed ${legacy} and flags it as legacy`, () => {
      write(dir, `node_modules/${legacy}/package.json`, JSON.stringify({ version: '0.3.0' }));
      assert.deepEqual(getInstalledVersion(dir), { version: '0.3.0', name: legacy, legacy: true });
    });
  }

  it('prefers the current package when old and new are installed', () => {
    write(dir, 'node_modules/@esimplicity/stack-tests/package.json', JSON.stringify({ version: '0.3.0' }));
    write(dir, 'node_modules/@esimplicitylabs/katalyst-xspec/package.json', JSON.stringify({ version: '0.6.0' }));
    assert.deepEqual(getInstalledVersion(dir), { version: '0.6.0', name: PACKAGE_NAME, legacy: false });
  });

  it('rewrites both legacy import specifiers (root and /steps) in features and playwright config only', () => {
    write(dir, 'features/steps/steps.ts', "import { a } from '@esimplicity/stack-tests/steps';\nimport { b } from \"@esimplicityinc/katalyst-xspec\";\n");
    write(dir, 'features/steps/custom/my.ts', "export * from '@esimplicityinc/katalyst-xspec/steps';\n");
    write(dir, 'playwright.config.ts', "import { resolveWorkers } from '@esimplicity/stack-tests';\n");
    write(dir, 'features/untouched.ts', "import x from '@esimplicity/stack-tests-other';\n");
    write(dir, 'node_modules/foo/index.ts', "import '@esimplicity/stack-tests';\n");

    const changed = rewriteLegacyImports(dir).sort();

    assert.deepEqual(changed, ['features/steps/custom/my.ts', 'features/steps/steps.ts', 'playwright.config.ts']);
    assert.equal(
      fs.readFileSync(path.join(dir, 'features/steps/steps.ts'), 'utf8'),
      "import { a } from '@esimplicitylabs/katalyst-xspec/steps';\nimport { b } from \"@esimplicitylabs/katalyst-xspec\";\n",
    );
    assert.equal(fs.readFileSync(path.join(dir, 'features/steps/custom/my.ts'), 'utf8'), "export * from '@esimplicitylabs/katalyst-xspec/steps';\n");
    assert.equal(fs.readFileSync(path.join(dir, 'features/untouched.ts'), 'utf8'), "import x from '@esimplicity/stack-tests-other';\n");
    assert.equal(fs.readFileSync(path.join(dir, 'node_modules/foo/index.ts'), 'utf8'), "import '@esimplicity/stack-tests';\n");
  });

  it('dry-run reports files but does not modify them', () => {
    write(dir, 'playwright.config.ts', "import { resolveWorkers } from '@esimplicity/stack-tests';\n");
    assert.deepEqual(rewriteLegacyImports(dir, { dryRun: true }), ['playwright.config.ts']);
    assert.match(fs.readFileSync(path.join(dir, 'playwright.config.ts'), 'utf8'), /@esimplicity\/stack-tests/);
  });

  it('removes only the exact GitHub Packages scope line that 0.4/0.5 scaffolded', () => {
    write(dir, '.npmrc', 'save-exact=true\n@esimplicityinc:registry=https://npm.pkg.github.com\n');
    assert.equal(removeGithubPackagesNpmrc(dir), true);
    assert.equal(fs.readFileSync(path.join(dir, '.npmrc'), 'utf8'), 'save-exact=true\n');
    assert.equal(removeGithubPackagesNpmrc(dir), false);
  });

  it('deletes .npmrc when that line was its only content', () => {
    write(dir, '.npmrc', '@esimplicityinc:registry=https://npm.pkg.github.com\n');
    assert.equal(removeGithubPackagesNpmrc(dir), true);
    assert.equal(fs.existsSync(path.join(dir, '.npmrc')), false);
  });

  it('keeps the scope line when the project also configures auth for it (other @esimplicityinc packages)', () => {
    const content = '@esimplicityinc:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n';
    write(dir, '.npmrc', content);
    assert.equal(removeGithubPackagesNpmrc(dir), false);
    assert.equal(fs.readFileSync(path.join(dir, '.npmrc'), 'utf8'), content);
  });

  it('is a no-op without .npmrc', () => {
    assert.equal(removeGithubPackagesNpmrc(dir), false);
  });

  it('migrate package.json merge drops both legacy dependencies', () => {
    const existing = JSON.stringify({
      name: 'my-tests',
      devDependencies: { '@esimplicity/stack-tests': '^0.3.0', '@esimplicityinc/katalyst-xspec': '^0.5.0', zod: '^3.0.0' },
    });
    const template = JSON.stringify({ devDependencies: { '@esimplicitylabs/katalyst-xspec': '^0.6.0' } });
    const merged = JSON.parse(mergePackageJson(existing, template));
    assert.deepEqual(merged.devDependencies, { zod: '^3.0.0', '@esimplicitylabs/katalyst-xspec': '^0.6.0' });
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

describe('stripTypeTagFilters', () => {
  const { stripTypeTagFilters, hasTypeTagFilters } = require('../cli/upgrade.cjs');
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-tags-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('removes type-tag-only project filters and projectTag from tagsForProject', () => {
    write(dir, 'playwright.config.ts', [
      "const api = defineBddProject({",
      "  name: 'api',",
      "  features: 'features/api/**/*.feature',",
      "  tags: '@api',",
      "});",
      "const ui = defineBddProject({ name: 'ui', tags: \"@ui\" });",
      "const h = defineBddProject({",
      "  tags: tagsForProject({ projectTag: '@hybrid', extraTags }),",
      "});",
      "const t = defineBddProject({ tags: tagsForProject({ projectTag: '@tui' }) });",
      "const s = defineBddProject({ tags: '@smoke' });",
      '',
    ].join('\n'));

    assert.equal(hasTypeTagFilters(dir), true);
    assert.deepEqual(stripTypeTagFilters(dir), ['playwright.config.ts']);
    assert.equal(fs.readFileSync(path.join(dir, 'playwright.config.ts'), 'utf8'), [
      "const api = defineBddProject({",
      "  name: 'api',",
      "  features: 'features/api/**/*.feature',",
      "});",
      "const ui = defineBddProject({ name: 'ui' });",
      "const h = defineBddProject({",
      "  tags: tagsForProject({ extraTags }),",
      "});",
      "const t = defineBddProject({ tags: tagsForProject({}) });",
      "const s = defineBddProject({ tags: '@smoke' });",
      '',
    ].join('\n'));
    assert.equal(hasTypeTagFilters(dir), false);
  });

  it('dry-run reports without writing; no config is a no-op', () => {
    assert.deepEqual(stripTypeTagFilters(dir), []);
    write(dir, 'playwright.config.ts', "defineBddProject({ tags: '@ui' });\n");
    assert.deepEqual(stripTypeTagFilters(dir, { dryRun: true }), ['playwright.config.ts']);
    assert.match(fs.readFileSync(path.join(dir, 'playwright.config.ts'), 'utf8'), /@ui/);
  });
});
