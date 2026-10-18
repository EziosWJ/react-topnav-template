import { apiClient, compactParams, unwrap } from '../../lib/api/client';
import { fetchAllPages } from '../../lib/api/fetchAll';
import type { PaginatedResponse } from '../../types/api';
import type { CustomerReferenceCheck } from '../../types/api';
import type { Customer, CustomerInput, CustomerListQuery } from '../../types/entities';

function params(query: CustomerListQuery): Record<string, string | number> {
  return compactParams({ ...query });
}

export const customersApi = {
  list(query: CustomerListQuery) {
    return unwrap(apiClient.get<PaginatedResponse<Customer>>('/customers', { params: params(query) }));
  },
  get(id: string) {
    return unwrap(apiClient.get<Customer>(`/customers/${id}`));
  },
  create(input: CustomerInput) {
    return unwrap(apiClient.post<Customer>('/customers', input));
  },
  update(id: string, input: CustomerInput) {
    return unwrap(apiClient.put<Customer>(`/customers/${id}`, input));
  },
  async remove(id: string) {
    await apiClient.delete<void>(`/customers/${id}`);
  },
  references(id: string) {
    return unwrap(apiClient.get<CustomerReferenceCheck>(`/customers/${id}/references`));
  },
};

/** Fetches every record matching the current filters for export. */
export async function fetchAllCustomers(query: CustomerListQuery): Promise<Customer[]> {
  return fetchAllPages((page, pageSize) => customersApi.list({ ...query, page, pageSize }));
}
