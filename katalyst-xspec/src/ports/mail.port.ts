/** An email as the tests see it. */
export type MailMessage = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  /** When the mail server received it. */
  date: Date;
};

export type MailQuery = {
  /** Recipient address (case-insensitive). */
  to?: string;
  /** Text the subject contains (case-insensitive). */
  subject?: string;
  /** Only messages received at or after this time. */
  since?: Date;
};

/**
 * A test inbox: a mail catcher such as Mailpit that the app under test sends
 * to. Used for email verification, password resets, magic links and one-time
 * codes sent by email.
 */
export interface MailPort {
  /** The newest message matching `query`, or undefined. */
  latest(query: MailQuery): Promise<MailMessage | undefined>;
  /** The newest message matching `query`, waiting up to `timeoutMs` for one to arrive. */
  waitFor(query: MailQuery, timeoutMs: number): Promise<MailMessage>;
  /** Delete every message. */
  clear(): Promise<void>;
}
