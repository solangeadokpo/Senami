import 'server-only';
import type { ApiResponse, ApiSchemas } from '@core/api/api-types';
import { serverApi } from '@core/api/server-api';

export type Challenge = ApiSchemas['ChallengeResponseDto'];
export type TotpEnrolment = ApiSchemas['TotpEnrolmentResponseDto'];

const BASE = '/auth/backoffice';

export function requestChallenge(
  email: string,
  password: string,
): Promise<ApiResponse<Challenge>> {
  return serverApi.request(`${BASE}/login`, {
    method: 'POST',
    body: { email, password },
  });
}

export function startEnrolment(
  challengeToken: string,
): Promise<ApiResponse<TotpEnrolment>> {
  return serverApi.request(`${BASE}/totp/enrolment`, {
    method: 'POST',
    body: { challengeToken },
  });
}

export function confirmEnrolment(
  challengeToken: string,
  code: string,
): Promise<ApiResponse<ApiSchemas['EnrolmentConfirmedResponseDto']>> {
  return serverApi.request(`${BASE}/totp/enrolment/confirm`, {
    method: 'POST',
    body: { challengeToken, code },
  });
}

export function verifyCode(
  challengeToken: string,
  code: string,
): Promise<ApiResponse<ApiSchemas['BackofficeSessionResponseDto']>> {
  return serverApi.request(`${BASE}/totp/verify`, {
    method: 'POST',
    body: { challengeToken, code },
  });
}

export function redeemRecoveryCode(
  challengeToken: string,
  recoveryCode: string,
): Promise<ApiResponse<ApiSchemas['RecoveryResponseDto']>> {
  return serverApi.request(`${BASE}/totp/recovery`, {
    method: 'POST',
    body: { challengeToken, recoveryCode },
  });
}

export function signOut(): Promise<ApiResponse<undefined>> {
  return serverApi.request('/auth/logout', { method: 'POST' });
}
