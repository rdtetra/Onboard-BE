export type AuditLogPayload = {
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
};
