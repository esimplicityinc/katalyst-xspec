'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ensureGitignoreEntries } = require('../cli/gitignore.cjs');

const BIN = path.resolve(__dirname, '..', 'bin', 'katalyst-xspec.cjs');

describe('ensureGitignoreEntries', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-gitignore-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const read = () => fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');

  it('creates .gitignore with the session folder', () => {
    assert.deepEqual(ensureGitignoreEntries(dir), ['.xspec/']);
    assert.match(read(), /^# katalyst-xspec: saved login sessions.*\n\.xspec\/\n$/);
  });

  it('appends to an existing file once, keeping its content', () => {
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules\n.env');
    assert.deepEqual(ensureGitignoreEntries(dir), ['.xspec/']);
    assert.deepEqual(ensureGitignoreEntries(dir), []);
    assert.match(read(), /^node_modules\n\.env\n\n# katalyst-xspec.*\n\.xspec\/\n$/);
  });

  for (const line of ['.xspec', '/.xspec/', '.xspec/*', '.xspec/**']) {
    it(`treats "${line}" as already ignored`, () => {
      fs.writeFileSync(path.join(dir, '.gitignore'), `${line}\n`);
      assert.deepEqual(ensureGitignoreEntries(dir), []);
      assert.equal(read(), `${line}\n`);
    });
  }

  it('changes nothing with dryRun', () => {
    assert.deepEqual(ensureGitignoreEntries(dir, { dryRun: true }), ['.xspec/']);
    assert.equal(fs.existsSync(path.join(dir, '.gitignore')), false);
  });
});

describe('init and upgrade --migrate ignore saved sessions', () => {
  it('a new project ignores .xspec/, and migrating an old one adds it', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-gitignore-cli-'));
    try {
      assert.equal(spawnSync(process.execPath, [BIN, 'init', '.', '--no-skills'], { cwd, encoding: 'utf8' }).status, 0);
      const file = path.join(cwd, '.gitignore');
      assert.equal(fs.readFileSync(file, 'utf8').match(/^\.xspec\/$/gm)?.length, 1);

      fs.writeFileSync(file, 'node_modules\n.env\n');
      const r = spawnSync(process.execPath, [BIN, 'upgrade', '--migrate', '--backup-dir', path.join(cwd, '.bk')], { cwd, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /\.gitignore: added \.xspec\//);
      assert.match(fs.readFileSync(file, 'utf8'), /^\.xspec\/$/m);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('init into a folder with its own .gitignore adds the entry', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-gitignore-cli-'));
    try {
      fs.writeFileSync(path.join(cwd, '.gitignore'), 'dist\n');
      assert.equal(spawnSync(process.execPath, [BIN, 'init', '.', '--no-skills'], { cwd, encoding: 'utf8' }).status, 0);
      assert.match(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8'), /^dist\n\n# katalyst-xspec.*\n\.xspec\/\n$/);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
