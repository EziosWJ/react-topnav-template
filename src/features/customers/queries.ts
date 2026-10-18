import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerInput, CustomerListQuery } from '../../types/entities';
import { invalidateDomains, queryKeys } from '../../lib/query/keys';
import { customersApi } from './api';

export function useCustomers(query: CustomerListQuery) {
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: () => customersApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => customersApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCustomerReferences(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.references(id ?? ''),
    queryFn: () => customersApi.references(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => customersApi.create(input),
    onSuccess: () => invalidateDomains(queryClient, ['customers', 'projects', 'orders', 'dashboard']),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) => customersApi.update(id, input),
    onSuccess: () => invalidateDomains(queryClient, ['customers', 'projects', 'orders', 'dashboard']),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => invalidateDomains(queryClient, ['customers', 'projects', 'orders', 'dashboard']),
  });
}
