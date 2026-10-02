#!/usr/bin/env node
'use strict';

/**
 * Step Stub Generator
 * 
 * Parses bddgen output to identify missing step definitions and generates
 * stub implementations in a single file: features/steps/generated-stubs.ts
 * 
 * Usage:
 *   npx katalyst-xspec stubs
 *   npx katalyst-xspec stubs --output custom-stubs.ts
 *   npx katalyst-xspec stubs --dry-run
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const options = {
    output: 'features/steps/generated-stubs.ts',
    dryRun: false,
    help: false,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Usage: npx katalyst-xspec stubs [options]

Generate step definition stubs for missing steps detected by bddgen.

Options:
  -o, --output <file>  Output file (default: features/steps/generated-stubs.ts)
  --dry-run            Show what would be generated without writing
  -v, --verbose        Show detailed output
  -h, --help           Show this help message

Examples:
  npx katalyst-xspec stubs                    # Generate stubs
  npx katalyst-xspec stubs --dry-run          # Preview what would be generated
  npx katalyst-xspec stubs -o my-stubs.ts     # Custom output file
`);
}

/**
 * Run bddgen and capture output including missing steps
 */
function runBddgenAndCapture() {
  try {
    // Run bddgen and capture both stdout and stderr
    const result = execSync('npx bddgen 2>&1', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return { output: result, success: true };
  } catch (error) {
    // bddgen exits with non-zero when steps are missing, but we still get output
    return { output: error.stdout || error.message, success: false };
  }
}

/**
 * Parse bddgen output to extract missing step definitions
 * 
 * bddgen outputs missing steps in format:
 *   Given('the ClawMarket API is available', async ({}) => {
 *   When('I do something with {string}', async ({}, arg0: string) => {
 */
function parseMissingSteps(output) {
  const steps = [];
  const seen = new Set(); // Deduplicate
  
  // Pattern 1: Full step definition format from bddgen
  // Given('pattern', async ({}, ...) => {
  const fullPattern = /(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\{[^}]*\}(?:\s*,\s*[^)]+)?\s*\)\s*=>\s*\{/g;
  
  let match;
  while ((match = fullPattern.exec(output)) !== null) {
    const keyword = match[1];
    const pattern = match[2];
    const key = `${keyword}:${pattern}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      steps.push({ keyword, pattern });
    }
  }
  
  // Pattern 2: Simpler format (just in case)
  // Given('pattern'
  const simplePattern = /(Given|When|Then)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  while ((match = simplePattern.exec(output)) !== null) {
    const keyword = match[1];
    const pattern = match[2];
    const key = `${keyword}:${pattern}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      steps.push({ keyword, pattern });
    }
  }
  
  return steps;
}

/**
 * Extract Cucumber expression parameters from a step pattern
 * @param {string} pattern - e.g., "I click the {string} button"
 * @returns {Array<{name: string, type: string}>}
 */
function extractParameters(pattern) {
  const params = [];
  const paramRegex = /\{([^}]+)\}/g;
  let match;
  let index = 0;
  
  while ((match = paramRegex.exec(pattern)) !== null) {
    const type = match[1];
    let tsType = 'string';
    let name = `arg${index}`;
    
    switch (type) {
      case 'int':
        tsType = 'number';
        name = `num${index}`;
        break;
      case 'float':
        tsType = 'number';
        name = `float${index}`;
        break;
      case 'string':
        tsType = 'string';
        name = `str${index}`;
        break;
      case 'word':
        tsType = 'string';
        name = `word${index}`;
        break;
      default:
        // Custom type or any
        tsType = 'string';
        name = `${type}${index}`;
    }
    
    params.push({ name, type: tsType, cucumberType: type });
    index++;
  }
  
  return params;
}

/**
 * Generate TypeScript stub for a single step
 */
function generateStepStub(step) {
  const params = extractParameters(step.pattern);
  
  // Build parameter list for the async function
  let paramList = '{ world }';
  if (params.length > 0) {
    const paramDefs = params.map(p => `${p.name}: ${p.type}`).join(', ');
    paramList = `{ world }, ${paramDefs}`;
  }
  
  // Build the step definition
  const stub = `
// TODO: Implement this step
// Pattern: ${step.pattern}
${step.keyword}('${step.pattern.replace(/'/g, "\\'")}', async (${paramList}) => {
  throw new Error('Step not implemented: ${step.pattern.replace(/'/g, "\\'")}');
});`;
  
  return stub;
}

/**
 * Generate the complete stubs file
 */
function generateStubsFile(steps) {
  // Group steps by keyword for organization
  const givenSteps = steps.filter(s => s.keyword === 'Given');
  const whenSteps = steps.filter(s => s.keyword === 'When');
  const thenSteps = steps.filter(s => s.keyword === 'Then');
  
  let content = `/**
 * Generated Step Stubs
 * 
 * This file was auto-generated by katalyst-xspec stubs.
 * It contains stub implementations for all missing step definitions.
 * 
 * Instructions:
 * 1. Review each stub and implement the actual logic
 * 2. Move implemented steps to appropriate step files (e.g., my-steps.ts)
 * 3. Delete this file or the implemented stubs
 * 4. Add import to steps.ts: import './generated-stubs.js';
 * 
 * Generated: ${new Date().toISOString()}
 * Total stubs: ${steps.length}
 */

import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.js';

const { Given, When, Then } = createBdd(test);
`;

  // Add Given steps
  if (givenSteps.length > 0) {
    content += `
// ============================================================================
// GIVEN STEPS (${givenSteps.length})
// ============================================================================
`;
    for (const step of givenSteps) {
      content += generateStepStub(step);
    }
  }
  
  // Add When steps
  if (whenSteps.length > 0) {
    content += `

// ============================================================================
// WHEN STEPS (${whenSteps.length})
// ============================================================================
`;
    for (const step of whenSteps) {
      content += generateStepStub(step);
    }
  }
  
  // Add Then steps
  if (thenSteps.length > 0) {
    content += `

// ============================================================================
// THEN STEPS (${thenSteps.length})
// ============================================================================
`;
    for (const step of thenSteps) {
      content += generateStepStub(step);
    }
  }
  
  content += '\n';
  
  return content;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('Step Stub Generator');
  console.log('═'.repeat(50));
  console.log('');
  
  // Run bddgen to get missing steps
  console.log('Running bddgen to detect missing steps...');
  const { output, success } = runBddgenAndCapture();
  
  if (options.verbose) {
    console.log('');
    console.log('bddgen output:');
    console.log('─'.repeat(50));
    console.log(output);
    console.log('─'.repeat(50));
  }
  
  // Parse missing steps
  const steps = parseMissingSteps(output);
  
  if (steps.length === 0) {
    console.log('');
    if (success) {
      console.log('No missing steps detected. All steps are implemented!');
    } else {
      console.log('Could not detect missing steps from bddgen output.');
      console.log('Try running with --verbose to see the full output.');
    }
    process.exit(0);
  }
  
  console.log(`Found ${steps.length} missing step(s)`);
  console.log('');
  
  // Group by keyword for summary
  const givenCount = steps.filter(s => s.keyword === 'Given').length;
  const whenCount = steps.filter(s => s.keyword === 'When').length;
  const thenCount = steps.filter(s => s.keyword === 'Then').length;
  
  console.log('Summary:');
  console.log(`  Given: ${givenCount}`);
  console.log(`  When:  ${whenCount}`);
  console.log(`  Then:  ${thenCount}`);
  console.log('');
  
  // Generate stub file content
  const stubContent = generateStubsFile(steps);
  
  if (options.dryRun) {
    console.log('Generated content (dry run):');
    console.log('─'.repeat(50));
    console.log(stubContent);
    console.log('─'.repeat(50));
    console.log('');
    console.log('Run without --dry-run to write to file.');
    process.exit(0);
  }
  
  // Write the file
  const outputPath = path.resolve(process.cwd(), options.output);
  const outputDir = path.dirname(outputPath);
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, stubContent);
  
  console.log(`Generated stubs written to: ${options.output}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Add to steps.ts: import \'./generated-stubs.js\';');
  console.log('  2. Implement each stub (replace throw with actual logic)');
  console.log('  3. Move implemented steps to appropriate files');
  console.log('  4. Run: npm run gen');
  console.log('  5. Run: npm test');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { main };
