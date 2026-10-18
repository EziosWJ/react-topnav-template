import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectInput, ProjectListQuery } from '../../types/entities';
import { invalidateDomains, queryKeys } from '../../lib/query/keys';
import { projectsApi } from './api';

export function useProjects(query: ProjectListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects.list(query),
    queryFn: () => projectsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => projectsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsApi.create(input),
    onSuccess: () => invalidateDomains(queryClient, ['projects', 'customers', 'orders', 'dashboard']),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) => projectsApi.update(id, input),
    onSuccess: () => invalidateDomains(queryClient, ['projects', 'customers', 'orders', 'dashboard']),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => invalidateDomains(queryClient, ['projects', 'customers', 'dashboard']),
  });
}
