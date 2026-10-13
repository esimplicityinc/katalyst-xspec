'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Folders katalyst-xspec writes that must stay out of git (saved login sessions). */
const GITIGNORE_ENTRIES = [
  { entry: '.xspec/', comment: '# katalyst-xspec: saved login sessions (contain session cookies)' },
];

function covers(lines, entry) {
  const bare = entry.replace(/^\/|\/$/g, '');
  return lines.some((l) => {
    const t = l.trim().replace(/^\/|\/(\*\*?)?$/g, '');
    return t === bare;
  });
}

/**
 * Add any missing GITIGNORE_ENTRIES to `<dir>/.gitignore` (creating it if
 * needed). Returns the entries added; running it again adds nothing.
 */
function ensureGitignoreEntries(dir, { dryRun = false } = {}) {
  const file = path.join(dir, '.gitignore');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const missing = GITIGNORE_ENTRIES.filter(({ entry }) => !covers(lines, entry));
  if (missing.length && !dryRun) {
    const block = missing.map(({ entry, comment }) => `${comment}\n${entry}`).join('\n');
    const prefix = existing && !existing.endsWith('\n') ? `${existing}\n` : existing;
    fs.writeFileSync(file, `${prefix}${prefix ? '\n' : ''}${block}\n`);
  }
  return missing.map(({ entry }) => entry);
}

module.exports = { GITIGNORE_ENTRIES, ensureGitignoreEntries };
