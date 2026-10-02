import { expect, type Page } from '@playwright/test';

const MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
};

/** Infer a content type from a file name's extension; defaults to text/plain. */
export function mimeTypeForFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) return 'text/plain';
  return MIME_TYPES[fileName.slice(dot + 1).toLowerCase()] ?? 'text/plain';
}

/**
 * Attach an in-memory file to an `<input type="file">` so uploads can be
 * exercised without a fixture file on disk.
 */
export async function setFileInputContent(page: Page, selector: string, fileName: string, content: string): Promise<void> {
  await page.locator(selector).setInputFiles({
    name: fileName,
    mimeType: mimeTypeForFileName(fileName),
    buffer: Buffer.from(content),
  });
}

/** Assert an element's attribute equals the given value (auto-retrying). */
export async function expectElementAttribute(
  page: Page,
  selector: string,
  attribute: string,
  value: string,
  options?: { timeout?: number },
): Promise<void> {
  await expect(page.locator(selector)).toHaveAttribute(attribute, value, options);
}
