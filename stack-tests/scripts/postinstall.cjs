#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BG_YELLOW = '\x1b[43m';
const BG_RED = '\x1b[41m';
const BLACK = '\x1b[30m';

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Strip ANSI codes for length calculation
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function printBox(lines, color = YELLOW) {
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length));
  const border = '═'.repeat(maxLen + 2);
  
  console.log(`${color}╔${border}╗${RESET}`);
  for (const line of lines) {
    const visibleLen = stripAnsi(line).length;
    const padding = ' '.repeat(maxLen - visibleLen);
    console.log(`${color}║${RESET} ${line}${padding} ${color}║${RESET}`);
  }
  console.log(`${color}╚${border}╝${RESET}`);
}

function main() {
  // Allow testing with --test-warning flag
  const testWarning = process.argv.includes('--test-warning');
  const hasTmux = testWarning ? false : checkCommand('tmux');
  const warnings = [];

  // Check for tmux (needed for TUI testing)
  if (!hasTmux) {
    warnings.push({
      title: 'tmux NOT FOUND',
      lines: [
        `${BOLD}TUI testing requires tmux${RESET}`,
        '',
        'If you plan to use @tui tests, install tmux:',
        '',
        `  ${CYAN}macOS:${RESET}         brew install tmux`,
        `  ${CYAN}Ubuntu/Debian:${RESET} sudo apt-get install tmux`,
        `  ${CYAN}Fedora/RHEL:${RESET}   sudo dnf install tmux`,
        '',
        `${YELLOW}Skip this if you only use @api, @ui, or @hybrid tests.${RESET}`,
      ],
    });
  }

  // Print warnings if any
  if (warnings.length > 0) {
    console.log('');
    console.log(`${BG_YELLOW}${BLACK}${BOLD} WARNING ${RESET}`);
    console.log('');
    
    for (const warning of warnings) {
      printBox(warning.lines, YELLOW);
      console.log('');
    }
  }

  // Always show success message
  console.log(`${GREEN}${BOLD}@esimplicityinc/stack-tests${RESET} installed successfully!`);
  console.log('');
}

main();
