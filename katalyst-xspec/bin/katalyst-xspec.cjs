#!/usr/bin/env node
'use strict';

// Single entry point: `katalyst-xspec <command> [options]`.
const path = require('path');

const COMMANDS = {
  init: { file: 'init.cjs', summary: 'Scaffold a new katalyst-xspec test project' },
  upgrade: { file: 'upgrade.cjs', summary: 'Upgrade katalyst-xspec, migrate scaffolding, update skills' },
  stubs: { file: 'stubs.cjs', summary: 'Generate stubs for undefined step definitions' },
};

function usage() {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([name, { summary }]) => `  ${name.padEnd(width)}  ${summary}`);
  return `Usage: katalyst-xspec <command> [options]

Commands:
${lines.join('\n')}

Run "katalyst-xspec <command> --help" for command options.

New project:   npx @esimplicityinc/katalyst-xspec init
In a project:  npx katalyst-xspec upgrade
`;
}

const [command, ...rest] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h' || command === 'help') {
  process.stdout.write(usage());
  process.exit(0);
}

if (command === '--version' || command === '-V') {
  console.log(require('../package.json').version);
  process.exit(0);
}

const entry = COMMANDS[command];
if (!entry) {
  console.error(`Unknown command: ${command}\n`);
  process.stderr.write(usage());
  process.exit(1);
}

// Subcommands parse process.argv.slice(2), so drop the command name.
process.argv = [process.argv[0], process.argv[1], ...rest];
require(path.join(__dirname, '..', 'cli', entry.file))
  .main()
  .catch((err) => {
    console.error(`[katalyst-xspec ${command}] ERROR: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
