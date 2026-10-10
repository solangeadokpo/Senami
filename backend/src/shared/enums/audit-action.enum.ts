/** Administration and security actions kept in audit_logs (NF-02). */
export enum AuditAction {
  SESSIONS_REVOKED = 'sessions_revoked',
  TOTP_ENROLLED = 'totp_enrolled',
  TOTP_LOCKED = 'totp_locked',
  TOTP_RESET = 'totp_reset',
  RECOVERY_CODE_USED = 'recovery_code_used',
}
