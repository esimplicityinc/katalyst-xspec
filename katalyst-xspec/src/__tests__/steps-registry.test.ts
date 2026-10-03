import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createBddTest } from '../fixtures.js';
import { registerApiSteps, registerUiSteps, registerSharedSteps, registerHybridSuite, registerTuiSteps } from '../steps/index.js';

// playwright-bdd keeps registered steps in a module-level array that isn't part
// of its public exports, so load it by file path.
const require = createRequire(import.meta.url);
const bddDist = path.dirname(require.resolve('playwright-bdd'));
const { stepDefinitions } = require(path.join(bddDist, 'steps', 'stepRegistry.js')) as {
  stepDefinitions: Array<{
    patternString: string;
    tagsExpression?: unknown;
    providedOptions?: { tags?: string };
    matchStepText(text: string): unknown;
  }>;
};

const { test } = createBddTest();
registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);
registerHybridSuite(test);
registerTuiSteps(test);

const here = path.dirname(fileURLToPath(import.meta.url));
const stepDocsDir = path.resolve(here, '../../../docs/reference/steps');

/** Step lines (keyword stripped) from ```gherkin blocks in the step reference docs. */
function documentedStepTexts(): string[] {
  const texts = new Set<string>();
  for (const file of fs.readdirSync(stepDocsDir).filter((f) => f.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(stepDocsDir, file), 'utf8');
    for (const block of md.matchAll(/```gherkin\n([\s\S]*?)```/g)) {
      for (const line of block[1].split('\n')) {
        const m = line.trim().match(/^(?:Given|When|Then|And|But)\s+(.+)$/);
        // Skip pattern-style lines like `When I click the button {string}`.
        if (m && !/\{(string|int|float|word)\}/.test(m[1])) texts.add(m[1]);
      }
    }
  }
  return [...texts];
}

describe('step registry', () => {
  it('registers every suite together without errors', () => {
    assert.ok(stepDefinitions.length > 150, `only ${stepDefinitions.length} steps registered`);
  });

  it('no step is scoped to a type tag (@api/@ui/@hybrid/@tui)', () => {
    const tagged = stepDefinitions.filter((s) => s.providedOptions?.tags).map((s) => `${s.patternString} [${s.providedOptions!.tags}]`);
    assert.deepEqual(tagged, []);
  });

  it('no two steps share the same pattern', () => {
    const seen = new Map<string, number>();
    for (const s of stepDefinitions) seen.set(s.patternString, (seen.get(s.patternString) ?? 0) + 1);
    assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([p]) => p), []);
  });

  it('every documented example step matches at most one definition', () => {
    const texts = documentedStepTexts();
    assert.ok(texts.length > 100, `only ${texts.length} documented examples found`);
    const ambiguous = texts
      .map((t) => ({ t, hits: stepDefinitions.filter((s) => s.matchStepText(t)).map((s) => s.patternString) }))
      .filter(({ hits }) => hits.length > 1)
      .map(({ t, hits }) => `${t}  ->  ${hits.join(' | ')}`);
    assert.deepEqual(ambiguous, []);
  });
});
