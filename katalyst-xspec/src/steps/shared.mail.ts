/**
 * Email steps: check what the app sent to a test inbox (Mailpit by default,
 * MAIL_API_URL) and use links and codes from it.
 */
import { createBdd } from 'playwright-bdd';
import type { MailMessage, MailPort, MailQuery } from '../ports/mail.port';
import type { World } from '../world';
import { interpolate } from '../utils';
import { emailCode, emailCodePattern, emailLink, emailLinks } from '../helpers/email';

const timeoutMs = () => Number(process.env.MAIL_TIMEOUT) || 10_000;

/** The newest email matching the query that arrived during this scenario, waiting for it. */
async function findEmail(mail: MailPort, world: World, query: MailQuery): Promise<MailMessage> {
  // Mail servers stamp messages to the second; allow for that and a little clock skew.
  const since = world.startedAt ? new Date(world.startedAt - 2000) : undefined;
  const message = await mail.waitFor({ ...query, since }, timeoutMs());
  world.lastEmail = message;
  return message;
}

export function registerMailSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  Then('{string} receives an email with subject {string}', async ({ mail, world }: any, to: string, subject: string) => {
    await findEmail(mail, world, { to: interpolate(to, world.vars), subject: interpolate(subject, world.vars) });
  });

  When('I open the link in the latest email to {string}', async ({ mail, ui, world }: any, to: string) => {
    const message = await findEmail(mail, world, { to: interpolate(to, world.vars) });
    const link = emailLink(message);
    if (!link) throw new Error(`The latest email to ${message.to.join(', ')} ("${message.subject}") has no links.`);
    await ui.goto(link);
  });

  When(
    'I open the link containing {string} in the latest email to {string}',
    async ({ mail, ui, world }: any, part: string, to: string) => {
      const message = await findEmail(mail, world, { to: interpolate(to, world.vars) });
      const wanted = interpolate(part, world.vars);
      const link = emailLink(message, wanted);
      if (!link) {
        throw new Error(
          `No link containing "${wanted}" in the latest email to ${message.to.join(', ')} ("${message.subject}"). ` +
            `Links: ${emailLinks(message).join(', ') || 'none'}.`,
        );
      }
      await ui.goto(link);
    },
  );

  Then('I store the code from the latest email to {string} as {string}', async ({ mail, world }: any, to: string, name: string) => {
    const message = await findEmail(mail, world, { to: interpolate(to, world.vars) });
    const pattern = emailCodePattern();
    const code = emailCode(message, pattern);
    if (!code) {
      throw new Error(`No code matching ${pattern} in the latest email to ${message.to.join(', ')} ("${message.subject}"). Set MAIL_CODE_PATTERN.`);
    }
    world.vars[name] = code;
  });

  Then('I store the link from the latest email to {string} as {string}', async ({ mail, world }: any, to: string, name: string) => {
    const message = await findEmail(mail, world, { to: interpolate(to, world.vars) });
    const link = emailLink(message);
    if (!link) throw new Error(`The latest email to ${message.to.join(', ')} ("${message.subject}") has no links.`);
    world.vars[name] = link;
  });

  Then('the latest email to {string} should contain {string}', async ({ mail, world }: any, to: string, text: string) => {
    const message = await findEmail(mail, world, { to: interpolate(to, world.vars) });
    const wanted = interpolate(text, world.vars);
    const body = `${message.subject}\n${message.text}\n${message.html.replace(/<[^>]+>/g, ' ')}`;
    if (!body.includes(wanted)) {
      throw new Error(`The latest email to ${message.to.join(', ')} ("${message.subject}") doesn't contain "${wanted}".`);
    }
  });

  Given('I clear the inbox', async ({ mail }: any) => {
    await mail.clear();
  });
}
