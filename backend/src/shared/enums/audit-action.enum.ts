/** Administration and security actions kept in audit_logs (NF-02). */
export enum AuditAction {
  SESSIONS_REVOKED = 'sessions_revoked',
  TOTP_ENROLLED = 'totp_enrolled',
  TOTP_LOCKED = 'totp_locked',
  TOTP_RESET = 'totp_reset',
  RECOVERY_CODE_USED = 'recovery_code_used',
  INVITATION_SENT = 'invitation_sent',
  INVITATION_ACCEPTED = 'invitation_accepted',
  ESTABLISHMENT_CREATED = 'establishment_created',
  ESTABLISHMENT_UPDATED = 'establishment_updated',
  ESTABLISHMENT_SUSPENDED = 'establishment_suspended',
  ESTABLISHMENT_REACTIVATED = 'establishment_reactivated',
  SHEET_RECIPIENTS_UPDATED = 'sheet_recipients_updated',
}
