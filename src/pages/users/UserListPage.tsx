import { useEffect, useState, type Key } from 'react';
import { App, Button, Form, Select, Space, Typography, type FormInstance } from 'antd';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { departmentOptions, roleOptions, userStatusOptions } from '../../config/options';
import {
  UserFormFields,
  userFormDefaults,
  userToFormValues,
} from '../../features/users/components/UserFormFields';
import { fetchAllUsers } from '../../features/users/api';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '../../features/users/queries';
import type { User, UserInput, UserListQuery } from '../../types/entities';
import { useListUrlState, type ListUrlConfig } from '../../hooks/useListUrlState';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useDataExport } from '../../hooks/useDataExport';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime, formatNullable } from '../../utils/format';
import { SearchFilterBar } from '../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../components/templates/ListPageTemplate';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { ExportButton } from '../../components/ExportButton/ExportButton';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import type { ExportColumn } from '../../utils/export';
import { applyServerFieldErrors } from '../../lib/forms';
import { routeDefinitions } from '../../config/routes';
import { copy } from '../../config/copy';

const sortFields = ['name', 'username', 'email', 'department', 'role', 'status', 'lastLoginAt', 'createdAt'] as const;

const exportColumns: Array<ExportColumn<User>> = [
  { header: '姓名', value: (row) => row.name, width: 12 },
  { header: '用户名', value: (row) => row.username, width: 16 },
  { header: '邮箱', value: (row) => row.email, width: 26 },
  { header: '部门', value: (row) => row.department, width: 14 },
  { header: '角色/岗位', value: (row) => row.role, width: 18 },
  {
    header: '状态',
    value: (row) => userStatusOptions.find((option) => option.value === row.status)?.label ?? row.status,
    width: 10,
  },
  { header: '最近登录', value: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '从未登录'), width: 20 },
  { header: '创建时间', value: (row) => formatDateTime(row.createdAt), width: 20 },
];

type DrawerState = { mode: 'create' } | { mode: 'edit'; record: User } | null;

const listConfig: ListUrlConfig = {
  allowedSortFields: sortFields,
  defaultSort: { field: 'createdAt', order: 'desc' },
  filterKeys: ['department', 'role', 'status'],
  allowedFilterValues: {
    department: departmentOptions.map((option) => option.value),
    role: roleOptions.map((option) => option.value),
    status: userStatusOptions.map((option) => option.value),
  },
};

const pageMeta = routeDefinitions.find((route) => route.path === '/users')!;

export default function UserListPage() {
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const [form] = Form.useForm<UserInput>();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  const {
    state,
    listQuery,
    keywordDraft,
    setKeywordDraft,
    submitSearch,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    reset,
    hasActiveFilters,
    hasActiveQuery,
  } = useListUrlState(listConfig);
  const query = listQuery as unknown as UserListQuery;
  const usersQuery = useUsers(query);
  const filterSignature = JSON.stringify({
    keyword: state.keyword,
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  });

  useEffect(() => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, [filterSignature]);

  // Keep the URL page valid when a delete or filter shrinks the result set.
  useEffect(() => {
    if (usersQuery.isFetching || !usersQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(usersQuery.data.total / state.pageSize));
    // Automatic normalisation must not create a history entry that traps Back.
    if (state.page > lastPage) setPage(lastPage, true);
  }, [usersQuery.data, usersQuery.isFetching, setPage, state.page, state.pageSize]);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const { exportFiltered, exportRowsOf } = useDataExport({
    moduleName: '用户',
    sheetName: '用户',
    columns: exportColumns,
    getRows: () => fetchAllUsers(query),
  });

  const openCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(userFormDefaults);
    setDrawer({ mode: 'create' });
  };

  const openEdit = (record: User) => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(userToFormValues(record));
    setDrawer({ mode: 'edit', record });
  };

  const closeDrawer = () => {
    setDrawer(null);
    form.resetFields();
    createMutation.reset();
    updateMutation.reset();
  };

  const submitForm = async (values: UserInput) => {
    try {
      if (drawer?.mode === 'edit') {
        await updateMutation.mutateAsync({ id: drawer.record.id, input: values });
        message.success(copy.messages.userUpdated);
      } else {
        await createMutation.mutateAsync(values);
        message.success(copy.messages.userCreated);
      }
      closeDrawer();
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const changeStatus = (record: User) => {
    const nextStatus = record.status === 'active' ? 'disabled' : 'active';
    const apply = async () => {
      try {
        await updateMutation.mutateAsync({
          id: record.id,
          input: { ...userToFormValues(record), status: nextStatus },
        });
        message.success(nextStatus === 'active' ? copy.messages.userEnabled : copy.messages.userDisabled);
      } catch (error) {
        message.error(getErrorMessage(error));
      }
    };

    if (nextStatus === 'disabled') {
      confirm({
        title: `停用用户「${record.name}」？`,
        content: '这是业务资料状态的演示操作，不涉及真实账号或登录权限。',
        okText: '停用',
        danger: true,
        onConfirm: apply,
      });
      return;
    }
    void apply();
  };

  const confirmDelete = (record: User) => {
    confirm({
      title: `删除用户「${record.name}」？`,
      content: '删除后不可恢复。本演示不包含真实账号、密码或权限生命周期。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(record.id);
          message.success(copy.messages.userDeleted);
          setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
          setSelectedRows((rows) => rows.filter((row) => row.id !== record.id));
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const columns: DataTableColumns<User> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      sorter: true,
      render: (value: string, record) => <Link to={`/users/${record.id}`}>{value}</Link>,
    },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 130, sorter: true },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 220, sorter: true, ellipsis: true },
    { title: '部门', dataIndex: 'department', key: 'department', width: 130, sorter: true },
    { title: '角色/岗位', dataIndex: 'role', key: 'role', width: 150, sorter: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: true,
      render: (_value: string, record) => <StatusTag kind="user" value={record.status} />,
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      sorter: true,
      render: (value: string | null) => (value ? formatDateTime(value) : formatNullable(null, '从未登录')),
    },
    {
      title: '操作',
      key: 'actions',
      width: 196,
      fixed: 'right',
      align: 'right',
      hideInSettings: true,
      render: (_value: unknown, record) => (
        <Space size={0} className="table-actions">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Link to={`/users/${record.id}`}>详情</Link>
          <Button type="link" size="small" onClick={() => changeStatus(record)}>
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            onClick={() => confirmDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate
        header={{
          title: pageMeta.title,
          description: pageMeta.description,
          meta: (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {usersQuery.isPending
                ? '正在统计用户数量…'
                : `共 ${usersQuery.data?.total ?? 0} 位用户 · 演示数据保存在内存中，刷新后重置`}
            </Typography.Text>
          ),
        }}
        filterBar={
          <SearchFilterBar
            keyword={keywordDraft}
            onKeywordChange={setKeywordDraft}
            onSearch={() => submitSearch()}
            onReset={reset}
            resetDisabled={!hasActiveQuery}
            loading={usersQuery.isFetching}
            placeholder="搜索姓名、用户名、邮箱或部门"
            filters={
              <>
                <Select
                  allowClear
                  placeholder="部门"
                  aria-label="按部门筛选"
                  value={state.filters.department}
                  onChange={(value) => setFilter('department', value)}
                  options={departmentOptions}
                  style={{ width: 140 }}
                />
                <Select
                  allowClear
                  placeholder="角色/岗位"
                  aria-label="按角色筛选"
                  value={state.filters.role}
                  onChange={(value) => setFilter('role', value)}
                  options={roleOptions}
                  style={{ width: 160 }}
                />
                <Select
                  allowClear
                  placeholder="状态"
                  aria-label="按状态筛选"
                  value={state.filters.status}
                  onChange={(value) => setFilter('status', value)}
                  options={userStatusOptions}
                  style={{ width: 120 }}
                />
              </>
            }
            resultSummary={
              usersQuery.isPending ? (
                '正在加载…'
              ) : (
                <>
                  共 <strong>{usersQuery.data?.total ?? 0}</strong> 条
                  {state.keyword ? ` · 关键词「${state.keyword}」` : ''}
                  {hasActiveFilters ? ' · 已应用筛选' : ''}
                </>
              )
            }
            actions={
              <Space wrap size={8}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {copy.actions.newUser}
                </Button>
                <ExportButton onExport={exportFiltered} disabled={usersQuery.isFetching} />
              </Space>
            }
          />
        }
      >
        <DataTable<User>
          tableId="users"
          tableLabel="用户列表"
          rowKey="id"
          columns={columns}
          dataSource={usersQuery.data?.items ?? []}
          loading={usersQuery.isFetching}
          error={usersQuery.error}
          onRetry={() => void usersQuery.refetch()}
          emptyTitle="暂无用户"
          emptyDescription="调整筛选条件，或创建第一位业务用户。"
          emptyAction={
            <Button type="primary" onClick={openCreate}>
              {copy.actions.newUser}
            </Button>
          }
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: usersQuery.data?.total ?? 0,
            onChange: (page, pageSize) => {
              if (pageSize !== state.pageSize) setPageSize(pageSize);
              else setPage(page);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            },
          }}
          sortState={{ field: state.sortBy, order: state.sortOrder }}
          onSortChange={setSort}
          batchActions={({ selectedRows: rows, clear }) => (
            <ExportButton
              size="small"
              scope="selected"
              label={`导出选中（${rows.length}）`}
              disabled={rows.length === 0}
              onExport={async (format) => {
                await exportRowsOf(rows, format);
                if (rows.length > 0) clear();
              }}
            />
          )}
          toolbar={
            selectedRows.length > 0 ? (
              <Typography.Text type="secondary">已选 {selectedRows.length} 条</Typography.Text>
            ) : null
          }
        />
      </ListPageTemplate>

      <UserFormDrawer
        open={drawer !== null}
        mode={drawer?.mode ?? 'create'}
        form={form}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={drawer?.mode === 'edit' ? updateMutation.error : createMutation.error}
        onClose={closeDrawer}
        onFinish={submitForm}
      />
    </>
  );
}

function UserFormDrawer({
  open,
  mode,
  form,
  submitting,
  error,
  onClose,
  onFinish,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  form: FormInstance<UserInput>;
  submitting: boolean;
  error: unknown;
  onClose: () => void;
  onFinish: (values: UserInput) => void | Promise<void>;
}) {
  return (
    <FormDrawer<UserInput>
      open={open}
      title={mode === 'edit' ? copy.actions.quickEditUser : copy.actions.newUser}
      description={
        mode === 'edit'
          ? '快速修改业务用户资料；复杂编辑请进入独立页面。'
          : '创建业务用户资料，不涉及真实账号或密码。'
      }
      form={form}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onFinish={onFinish}
      submitText={mode === 'edit' ? copy.form.saveChanges : copy.actions.createUser}
    >
      <UserFormFields />
    </FormDrawer>
  );
}
