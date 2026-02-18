export enum SourceType {
  URL = 'URL',
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
}

export enum SourceStatus {
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
}

export enum RefreshSchedule {
  MANUAL = 'MANUAL',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}
