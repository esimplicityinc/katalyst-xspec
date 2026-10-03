import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveExtraTags, tagsForProject } from '../config.js';

describe('tagsForProject', () => {
  it('without a project tag, only applies the default excludes', () => {
    assert.equal(tagsForProject(), 'not @Skip and not @ignore');
  });

  it('adds extra tags from TEST_TAGS', () => {
    assert.equal(tagsForProject({ extraTags: '@smoke or @critical' }), 'not @Skip and not @ignore and (@smoke or @critical)');
  });

  it('still supports a project tag', () => {
    assert.equal(tagsForProject({ projectTag: '@api', extraTags: '@smoke' }), 'not @Skip and not @ignore and @api and (@smoke)');
  });
});

describe('resolveExtraTags', () => {
  it('turns a comma list into an or-expression', () => {
    assert.equal(resolveExtraTags('smoke,critical'), '@smoke or @critical');
  });
  it('passes expressions through and ignores blanks', () => {
    assert.equal(resolveExtraTags('@a and not @b'), '@a and not @b');
    assert.equal(resolveExtraTags('  '), undefined);
  });
});
