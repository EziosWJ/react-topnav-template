import { apiClient, compactParams, unwrap } from '../../lib/api/client';
import { fetchAllPages } from '../../lib/api/fetchAll';
import type { PaginatedResponse } from '../../types/api';
import type { User, UserInput, UserListQuery } from '../../types/entities';

function params(query: UserListQuery): Record<string, string | number> {
  return compactParams({ ...query });
}

export const usersApi = {
  list(query: UserListQuery) {
    return unwrap(apiClient.get<PaginatedResponse<User>>('/users', { params: params(query) }));
  },
  get(id: string) {
    return unwrap(apiClient.get<User>(`/users/${id}`));
  },
  create(input: UserInput) {
    return unwrap(apiClient.post<User>('/users', input));
  },
  update(id: string, input: UserInput) {
    return unwrap(apiClient.put<User>(`/users/${id}`, input));
  },
  async remove(id: string) {
    await apiClient.delete<void>(`/users/${id}`);
  },
};

export async function fetchAllUsers(query: UserListQuery): Promise<User[]> {
  return fetchAllPages((page, pageSize) => usersApi.list({ ...query, page, pageSize }));
}
