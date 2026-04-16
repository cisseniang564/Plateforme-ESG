import { api } from "./api";

export interface TenantStats {
  users_count: number;
  organizations_count: number;
  scores_count: number;
}

export async function getTenantStats(): Promise<TenantStats> {
  const response = await api.get("/tenants/me/stats");
  return response.data;
}