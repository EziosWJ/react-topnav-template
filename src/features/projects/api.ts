import { apiClient, compactParams, unwrap } from '../../lib/api/client';
import { fetchAllPages } from '../../lib/api/fetchAll';
import type { PaginatedResponse } from '../../types/api';
import type { Project, ProjectInput, ProjectListQuery } from '../../types/entities';

function params(query: ProjectListQuery): Record<string, string | number> {
  return compactParams({ ...query });
}

export const projectsApi = {
  list(query: ProjectListQuery) {
    return unwrap(apiClient.get<PaginatedResponse<Project>>('/projects', { params: params(query) }));
  },
  get(id: string) {
    return unwrap(apiClient.get<Project>(`/projects/${id}`));
  },
  create(input: ProjectInput) {
    return unwrap(apiClient.post<Project>('/projects', input));
  },
  update(id: string, input: ProjectInput) {
    return unwrap(apiClient.put<Project>(`/projects/${id}`, input));
  },
  async remove(id: string) {
    await apiClient.delete<void>(`/projects/${id}`);
  },
};

export async function fetchAllProjects(query: ProjectListQuery): Promise<Project[]> {
  return fetchAllPages((page, pageSize) => projectsApi.list({ ...query, page, pageSize }));
}
