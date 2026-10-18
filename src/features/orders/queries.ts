import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderInput, OrderListQuery } from '../../types/entities';
import { invalidateDomains, queryKeys } from '../../lib/query/keys';
import { ordersApi } from './api';

export function useOrders(query: OrderListQuery) {
  return useQuery({
    queryKey: queryKeys.orders.list(query),
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => ordersApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderInput) => ordersApi.create(input),
    onSuccess: () => invalidateDomains(queryClient, ['orders', 'customers', 'dashboard']),
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrderInput }) => ordersApi.update(id, input),
    onSuccess: () => invalidateDomains(queryClient, ['orders', 'customers', 'dashboard']),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.remove(id),
    onSuccess: () => invalidateDomains(queryClient, ['orders', 'customers', 'dashboard']),
  });
}
