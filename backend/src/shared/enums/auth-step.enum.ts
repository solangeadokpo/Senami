/** What the back office sign-in expects after the password. */
export enum AuthStep {
  TOTP_VERIFICATION = 'totp_verification',
  TOTP_ENROLMENT = 'totp_enrolment',
}
