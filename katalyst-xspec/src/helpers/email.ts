/** Getting links and codes out of emails. */
import type { MailMessage } from '../ports/mail.port';
import { decodeEntities } from '../auth/oidc/html-form';

type Env = Record<string, string | undefined>;

/** Links in an email: `href`s from the HTML part, then URLs in the text part, without duplicates. */
export function emailLinks(message: Pick<MailMessage, 'html' | 'text'>): string[] {
  const links: string[] = [];
  for (const m of message.html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) links.push(decodeEntities(m[1] ?? m[2]));
  for (const m of message.text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) links.push(m[0].replace(/[.,;:!?]+$/, ''));
  return [...new Set(links.filter((l) => /^https?:\/\//i.test(l)))];
}

/** The first link, or the first containing `part`. */
export function emailLink(message: Pick<MailMessage, 'html' | 'text'>, part?: string): string | undefined {
  return emailLinks(message).find((l) => !part || l.includes(part));
}

/** MAIL_CODE_PATTERN (a regex; its first group, if any, is the code), default: the first 4 to 8 digit number. */
export function emailCodePattern(env: Env = process.env): RegExp {
  const raw = env.MAIL_CODE_PATTERN;
  if (!raw) return /\b(\d{4,8})\b/;
  try {
    return new RegExp(raw);
  } catch (err) {
    throw new Error(`MAIL_CODE_PATTERN is not a valid regular expression: ${(err as Error).message}`);
  }
}

/** A code from the email's text (or, if it has none, its HTML with tags removed). */
export function emailCode(message: Pick<MailMessage, 'html' | 'text'>, pattern: RegExp = emailCodePattern()): string | undefined {
  const plain = message.text || decodeEntities(message.html.replace(/<style[\s\S]*?<\/style>|<[^>]+>/gi, ' '));
  const m = pattern.exec(plain);
  return m ? (m[1] ?? m[0]) : undefined;
}
