// --- Bot (hostname + target path) ---

const DOMAIN_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?';

/** RFC 1035-style hostname: localhost, or dot-separated labels. */
export const BOT_DOMAIN_REGEX = new RegExp(
  `^(?:localhost|(?:${DOMAIN_LABEL}\\.)+${DOMAIN_LABEL})$`,
);

/** Path starting with / for bot and task target URLs. */
export const BOT_TARGET_PATH_REGEX = /^\/[a-zA-Z0-9\-_.~/:?=&%]*$/;

// --- Widget ---

export const WIDGET_HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// --- Payment method ---

export const PAYMENT_CARD_NUMBER_CHARS_REGEX = /^[\d\s-]+$/;

export const PAYMENT_CARD_EXPIRY_REGEX =
  /^(0[1-9]|1[0-2])\/([0-9]{2}|[0-9]{4})$/;

export const PAYMENT_CARD_PREFIX_DIGITS_REGEX = /^\d+$/;
