import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  LicenseItem,
  LicenseListResponse,
  LicenseAssignmentItem,
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateLicenseAssignmentDto,
} from "@shared/api.interface";

export interface GetLicensesParams {
  keyword?: string;
  software_type?: string;
  page?: number;
  pageSize?: number;
}

export async function list(
  params: GetLicensesParams,
): Promise<LicenseListResponse> {
  const response = await axiosForBackend({
    url: "/api/licenses",
    method: "GET",
    params,
  });
  return response.data;
}

export async function create(
  data: CreateLicenseDto,
): Promise<LicenseItem> {
  const response = await axiosForBackend({
    url: "/api/licenses",
    method: "POST",
    data,
  });
  return response.data;
}

export async function update(
  id: string,
  data: UpdateLicenseDto,
): Promise<LicenseItem> {
  const response = await axiosForBackend({
    url: `/api/licenses/${id}`,
    method: "PUT",
    data,
  });
  return response.data;
}

export async function remove(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/licenses/${id}`,
    method: "DELETE",
  });
}

export async function getAssignments(
  licenseId: string,
): Promise<LicenseAssignmentItem[]> {
  const response = await axiosForBackend({
    url: `/api/licenses/${licenseId}/assignments`,
    method: "GET",
  });
  return response.data;
}

export async function assignSeat(
  licenseId: string,
  data: CreateLicenseAssignmentDto,
): Promise<LicenseAssignmentItem> {
  const response = await axiosForBackend({
    url: `/api/licenses/${licenseId}/assignments`,
    method: "POST",
    data,
  });
  return response.data;
}

export async function revokeSeat(
  assignmentId: string,
): Promise<void> {
  await axiosForBackend({
    url: `/api/licenses/assignments/${assignmentId}/revoke`,
    method: "PATCH",
  });
}