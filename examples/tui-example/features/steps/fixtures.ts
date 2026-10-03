import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBddTest, TuiTesterAdapter } from '@esimplicitylabs/katalyst-xspec';

const here = path.dirname(fileURLToPath(import.meta.url));

export const { test } = createBddTest({
  // Each scenario gets a fresh tmux session running the CLI under test.
  createTui: () =>
    new TuiTesterAdapter({
      command: ['node', path.resolve(here, '../../app.mjs')],
      size: { cols: 80, rows: 24 },
      debug: process.env.DEBUG === 'true',
    }),
});
