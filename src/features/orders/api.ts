import { apiClient, compactParams, unwrap } from '../../lib/api/client';
import { fetchAllPages } from '../../lib/api/fetchAll';
import type { PaginatedResponse } from '../../types/api';
import type { Order, OrderInput, OrderListQuery } from '../../types/entities';

function params(query: OrderListQuery): Record<string, string | number> {
  return compactParams({ ...query });
}

export const ordersApi = {
  list(query: OrderListQuery) {
    return unwrap(apiClient.get<PaginatedResponse<Order>>('/orders', { params: params(query) }));
  },
  get(id: string) {
    return unwrap(apiClient.get<Order>(`/orders/${id}`));
  },
  create(input: OrderInput) {
    return unwrap(apiClient.post<Order>('/orders', input));
  },
  update(id: string, input: OrderInput) {
    return unwrap(apiClient.put<Order>(`/orders/${id}`, input));
  },
  async remove(id: string) {
    await apiClient.delete<void>(`/orders/${id}`);
  },
};

export async function fetchAllOrders(query: OrderListQuery): Promise<Order[]> {
  return fetchAllPages((page, pageSize) => ordersApi.list({ ...query, page, pageSize }));
}
