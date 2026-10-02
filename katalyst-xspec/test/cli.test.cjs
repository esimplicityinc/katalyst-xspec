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

  it('accepts the target directory positionally (init my-tests)', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-init-'));
    try {
      const r = spawnSync(process.execPath, [BIN, 'init', 'my-tests', '--no-skills'], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'my-tests', 'package.json'), 'utf8'));
      assert.equal(pkg.scripts['gen:stubs'], 'katalyst-xspec stubs');
      assert.equal(pkg.scripts.upgrade, 'katalyst-xspec upgrade');
      assert.ok(pkg.devDependencies['@esimplicitylabs/katalyst-xspec']);
      // Published on npmjs.com: no registry mapping or token needed.
      assert.equal(fs.existsSync(path.join(cwd, 'my-tests', '.npmrc')), false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
