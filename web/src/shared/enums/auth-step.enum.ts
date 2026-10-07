/** Mirrors the backend AuthStep: what the back office sign-in asks next. */
export enum AuthStep {
  TOTP_VERIFICATION = 'totp_verification',
  TOTP_ENROLMENT = 'totp_enrolment',
}
