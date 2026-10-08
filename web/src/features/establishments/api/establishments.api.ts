import 'server-only';
import { ApiError } from '@core/api/api-error';
import type { ApiSchemas } from '@core/api/api-types';
import { serverApi } from '@core/api/server-api';
import {
  PAGE_SIZE,
  type ListFilters,
} from '@features/establishments/utils/list-filters';

export type EstablishmentSummary =
  ApiSchemas['EstablishmentSummaryResponseDto'];
export type EstablishmentDetail = ApiSchemas['EstablishmentDetailResponseDto'];
export type EstablishmentFieldsBody = ApiSchemas['EstablishmentFieldsDto'];
export type CreatedEstablishment =
  ApiSchemas['CreatedEstablishmentResponseDto'];

export interface EstablishmentPage {
  items: EstablishmentSummary[];
  total: number;
  totalPages: number;
}

export async function listEstablishments(
  filters: ListFilters,
): Promise<EstablishmentPage> {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(PAGE_SIZE),
  });
  if (filters.search !== '') params.set('search', filters.search);
  if (filters.city !== '') params.set('city', filters.city);
  if (filters.status !== undefined) params.set('status', filters.status);

  const { data, meta } = await serverApi.request<EstablishmentSummary[]>(
    `/establishments?${params.toString()}`,
  );
  const total =
    typeof meta?.['total'] === 'number' ? meta['total'] : data.length;
  const totalPages =
    typeof meta?.['totalPages'] === 'number' ? meta['totalPages'] : 1;
  return { items: data, total, totalPages };
}

export async function listCities(): Promise<string[]> {
  return (await serverApi.request<string[]>('/establishments/cities')).data;
}

/** null for an unknown establishment, or another one's for a responsable. */
export async function getEstablishment(
  establishmentId: string,
): Promise<EstablishmentDetail | null> {
  try {
    return (
      await serverApi.request<EstablishmentDetail>(
        `/establishments/${establishmentId}`,
      )
    ).data;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    )
      return null;
    throw error;
  }
}

export async function createEstablishment(
  body: ApiSchemas['CreateEstablishmentDto'],
): Promise<CreatedEstablishment> {
  return (
    await serverApi.request<CreatedEstablishment>('/establishments', {
      method: 'POST',
      body,
    })
  ).data;
}

export async function updateEstablishment(
  establishmentId: string,
  body: ApiSchemas['UpdateEstablishmentDto'],
): Promise<EstablishmentDetail> {
  return (
    await serverApi.request<EstablishmentDetail>(
      `/establishments/${establishmentId}`,
      { method: 'PATCH', body },
    )
  ).data;
}

export async function suspendEstablishment(
  establishmentId: string,
  reason: string,
): Promise<void> {
  await serverApi.request(`/establishments/${establishmentId}/suspension`, {
    method: 'POST',
    body: { reason },
  });
}

export async function reactivateEstablishment(
  establishmentId: string,
): Promise<void> {
  await serverApi.request(`/establishments/${establishmentId}/suspension`, {
    method: 'DELETE',
  });
}

export async function uploadLogo(
  establishmentId: string,
  logo: File,
): Promise<void> {
  const body = new FormData();
  body.set('logo', logo);
  await serverApi.request(`/establishments/${establishmentId}/logo`, {
    method: 'PUT',
    body,
  });
}

export async function removeLogo(establishmentId: string): Promise<void> {
  await serverApi.request(`/establishments/${establishmentId}/logo`, {
    method: 'DELETE',
  });
}

export async function resendInvitation(
  userId: string,
): Promise<{ expiresAt: string }> {
  return (
    await serverApi.request<{ expiresAt: string }>(
      `/users/${userId}/invitation`,
      { method: 'POST' },
    )
  ).data;
}

/** 2FA-04, from F2. */
export async function resetSecondFactor(userId: string): Promise<void> {
  await serverApi.request(`/users/${userId}/totp/reset`, { method: 'POST' });
}
