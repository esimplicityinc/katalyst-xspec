import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Browser, type Page } from '@playwright/test';
import { expectElementAttribute, mimeTypeForFileName, setFileInputContent } from '../helpers/ui-element.js';

describe('mimeTypeForFileName', () => {
  it('maps known extensions case-insensitively', () => {
    assert.equal(mimeTypeForFileName('data.csv'), 'text/csv');
    assert.equal(mimeTypeForFileName('DATA.JSON'), 'application/json');
    assert.equal(mimeTypeForFileName('feed.xml'), 'application/xml');
  });

  it('falls back to text/plain for unknown or missing extensions', () => {
    assert.equal(mimeTypeForFileName('notes.txt'), 'text/plain');
    assert.equal(mimeTypeForFileName('README'), 'text/plain');
    assert.equal(mimeTypeForFileName('archive.tar.gz'), 'text/plain');
  });
});

// Browser-backed checks for the step handlers. Skipped (not failed) when no
// Chromium build is installed, e.g. on a machine without `npx playwright install`.
let browser: Browser | undefined;
let skipReason: string | false = false;
try {
  browser = await chromium.launch();
} catch (err) {
  skipReason = `chromium unavailable: ${(err as Error).message.split('\n')[0]}`;
}

describe('ui element helpers (browser)', { skip: skipReason }, () => {
  let page: Page;

  before(async () => {
    page = await browser!.newPage();
  });

  after(async () => {
    await browser?.close();
  });

  it('setFileInputContent attaches an in-memory file with name, type and content', async () => {
    await page.setContent('<input id="upload" type="file">');
    await setFileInputContent(page, '#upload', 'rows.csv', 'a,b\n1,2');

    const file = await page.locator('#upload').evaluate(async (el: HTMLInputElement) => {
      const f = el.files![0];
      return { name: f.name, type: f.type, text: await f.text() };
    });
    assert.deepEqual(file, { name: 'rows.csv', type: 'text/csv', text: 'a,b\n1,2' });
  });

  it('expectElementAttribute passes when the attribute matches', async () => {
    await page.setContent('<div id="panel" data-state="expanded" aria-hidden="false"></div>');
    await expectElementAttribute(page, '#panel', 'data-state', 'expanded');
    await expectElementAttribute(page, '#panel', 'aria-hidden', 'false');
  });

  it('expectElementAttribute fails when the attribute differs', async () => {
    await page.setContent('<div id="panel" data-state="collapsed"></div>');
    await assert.rejects(expectElementAttribute(page, '#panel', 'data-state', 'expanded', { timeout: 200 }));
  });
});
