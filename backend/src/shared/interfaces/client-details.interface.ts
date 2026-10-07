/** Who called, for the audit log only: never written to application logs. */
export interface ClientDetails {
  ipAddress: string | null;
  userAgent: string | null;
}
