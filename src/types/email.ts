import type * as ejs from 'ejs';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

export type RenderOptions = {
  /** EJS options (e.g. escape, delimiter). */
  options?: ejs.Options;
};
