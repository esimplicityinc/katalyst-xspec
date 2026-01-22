/**
 * UI Form Step Definitions
 *
 * Steps for bulk form filling using Gherkin data tables.
 * Tagged with @ui or @hybrid for selective execution.
 */

import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerFormSteps(test: any): void {
  const { Given, When } = createBdd(test as any) as any;

  /**
   * Fill multiple form fields using a data table.
   * Default locator method is "label".
   *
   * @example
   * When I fill the form:
   *   | field    | value              |
   *   | Email    | test@example.com   |
   *   | Password | secret123          |
   */
  When(
    'I fill the form:',
    { tags: '@ui or @hybrid' },
    async ({ ui, world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1).map((row: string[]) => ({
        field: row[0],
        value: row[1],
      })) || [];

      for (const row of rows) {
        const field = interpolate(row.field, world.vars);
        const value = interpolate(row.value, world.vars);
        await ui.fillLabel(field, value);
      }
    }
  );

  /**
   * Fill multiple form fields using a specified locator method.
   *
   * @example
   * When I fill the form with "placeholder" locators:
   *   | field         | value              |
   *   | Enter email   | test@example.com   |
   *   | Enter password| secret123          |
   */
  When(
    'I fill the form with {string} locators:',
    { tags: '@ui or @hybrid' },
    async ({ ui, world }: any, locatorMethod: string, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1).map((row: string[]) => ({
        field: row[0],
        value: row[1],
      })) || [];

      for (const row of rows) {
        const field = interpolate(row.field, world.vars);
        const value = interpolate(row.value, world.vars);
        await ui.inputInElement('fill', value, '1', field, locatorMethod);
      }
    }
  );

  /**
   * Fill form fields and submit.
   *
   * @example
   * When I fill and submit the form:
   *   | field    | value              |
   *   | Email    | test@example.com   |
   *   | Password | secret123          |
   */
  When(
    'I fill and submit the form:',
    { tags: '@ui or @hybrid' },
    async ({ ui, world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1).map((row: string[]) => ({
        field: row[0],
        value: row[1],
      })) || [];

      for (const row of rows) {
        const field = interpolate(row.field, world.vars);
        const value = interpolate(row.value, world.vars);
        await ui.fillLabel(field, value);
      }

      // Press Enter to submit
      await ui.pressKey('Enter');
    }
  );

  /**
   * Clear and fill form fields (ensures fields are empty first).
   *
   * @example
   * When I clear and fill the form:
   *   | field    | value              |
   *   | Email    | newemail@test.com  |
   */
  Given(
    'I clear and fill the form:',
    { tags: '@ui or @hybrid' },
    async ({ page, world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1).map((row: string[]) => ({
        field: row[0],
        value: row[1],
      })) || [];

      for (const row of rows) {
        const field = interpolate(row.field, world.vars);
        const value = interpolate(row.value, world.vars);
        const locator = page.getByLabel(field);
        await locator.clear();
        await locator.fill(value);
      }
    }
  );
}
