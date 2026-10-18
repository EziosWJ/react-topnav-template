import { useMemo } from 'react';
import { Select, Spin } from 'antd';
import { useProject, useProjects } from '../queries';

export interface ProjectSelectProps {
  customerId?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  allowClear?: boolean;
  status?: 'error' | 'warning';
  id?: string;
}

export function ProjectSelect({
  customerId,
  value,
  onChange,
  disabled,
  allowClear = true,
  status,
  id,
}: ProjectSelectProps) {
  const listQuery = useProjects(
    {
      page: 1,
      pageSize: 100,
      ...(customerId ? { customerId } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
    },
    Boolean(customerId),
  );
  const selectedQuery = useProject(value);

  const options = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const selected = selectedQuery.data;
    const merged = selected && !items.some((item) => item.id === selected.id) ? [selected, ...items] : items;
    return merged.map((project) => ({
      value: project.id,
      label: `${project.name}（${project.code}）`,
    }));
  }, [listQuery.data, selectedQuery.data]);

  return (
    <Select
      id={id}
      allowClear={allowClear}
      value={value || undefined}
      placeholder={customerId ? '选择该客户下的项目（可选）' : '请先选择客户'}
      aria-label="选择关联项目"
      status={status}
      disabled={disabled || !customerId}
      onChange={(next) => onChange?.(next as string | undefined)}
      options={options}
      loading={listQuery.isFetching}
      notFoundContent={listQuery.isFetching ? <Spin size="small" /> : '该客户暂无可选项目'}
      style={{ width: '100%' }}
    />
  );
}
