export enum BotType {
  GENERAL = 'GENERAL',
  PROJECT = 'PROJECT',
}

export enum BotState {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum VisibilityDuration {
  ONE_DAY = '1d',
  TWO_DAYS = '2d',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
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
