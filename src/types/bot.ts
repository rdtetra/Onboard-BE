export enum BotType {
  GENERAL = 'GENERAL',
  PROJECT = 'PROJECT',
  /** @deprecated Legacy value; treated like PROJECT. Kept so existing DB rows (bot_type = 'URL_SPECIFIC') remain valid. */
  URL_SPECIFIC = 'URL_SPECIFIC',
}

export enum Behavior {
  AUTO_SHOW = 'AUTO_SHOW',
  BUTTON_ONLY = 'BUTTON_ONLY',
}

export enum BotPriority {
  HIGHEST = 'HIGHEST',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}
