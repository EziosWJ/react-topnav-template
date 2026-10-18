import { useMemo, useState } from 'react';
import { Select, Spin } from 'antd';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useCustomer, useCustomers } from '../queries';

export interface CustomerSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  status?: 'error' | 'warning';
  id?: string;
}

export function CustomerSelect({
  value,
  onChange,
  disabled,
  placeholder = '搜索并选择客户',
  allowClear = true,
  status,
  id,
}: CustomerSelectProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const listQuery = useCustomers({
    page: 1,
    pageSize: 20,
    ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const selectedQuery = useCustomer(value);

  const options = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const selected = selectedQuery.data;
    const merged = selected && !items.some((item) => item.id === selected.id) ? [selected, ...items] : items;
    return merged.map((customer) => ({
      value: customer.id,
      label: `${customer.name}（${customer.code}）`,
    }));
  }, [listQuery.data, selectedQuery.data]);

  return (
    <Select
      id={id}
      showSearch
      allowClear={allowClear}
      value={value || undefined}
      placeholder={placeholder}
      aria-label="选择客户"
      status={status}
      disabled={disabled}
      filterOption={false}
      onSearch={setSearch}
      onChange={(next) => onChange?.(next as string | undefined)}
      options={options}
      loading={listQuery.isFetching}
      notFoundContent={listQuery.isFetching ? <Spin size="small" /> : '没有匹配的客户'}
      style={{ width: '100%' }}
    />
  );
}
