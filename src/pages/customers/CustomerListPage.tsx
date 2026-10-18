import { useEffect, useState, type Key } from 'react';
import { App, Button, Drawer, Form, Select, Space, Tag, Typography, type FormInstance } from 'antd';
import { Plus, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customerStatusOptions, industryOptions } from '../../config/options';
import {
  CustomerFormFields,
  customerFormDefaults,
  customerToFormValues,
} from '../../features/customers/components/CustomerFormFields';
import {
  fetchAllCustomers,
} from '../../features/customers/api';
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from '../../features/customers/queries';
import type { Customer, CustomerInput, CustomerListQuery } from '../../types/entities';
import { useListUrlState, type ListUrlConfig } from '../../hooks/useListUrlState';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useDataExport } from '../../hooks/useDataExport';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../utils/format';
import { SearchFilterBar } from '../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../components/templates/ListPageTemplate';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { ExportButton } from '../../components/ExportButton/ExportButton';
import { MockUpload } from '../../components/MockUpload/MockUpload';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import type { ExportColumn } from '../../utils/export';
import { applyServerFieldErrors } from '../../lib/forms';
import { routeDefinitions } from '../../config/routes';
import { copy } from '../../config/copy';

const sortFields = ['name', 'code', 'industry', 'status', 'createdAt'] as const;

const exportColumns: Array<ExportColumn<Customer>> = [
  { header: '客户名称', value: (row) => row.name, width: 24 },
  { header: '客户编码', value: (row) => row.code, width: 14 },
  { header: '行业', value: (row) => row.industry, width: 14 },
  { header: '联系人', value: (row) => row.contactName, width: 12 },
  { header: '联系电话', value: (row) => row.phone, width: 16 },
  { header: '邮箱', value: (row) => row.email, width: 26 },
  { header: '状态', value: (row) => customerStatusOptions.find((option) => option.value === row.status)?.label ?? row.status, width: 12 },
  { header: '创建时间', value: (row) => formatDateTime(row.createdAt), width: 20 },
  { header: '备注', value: (row) => row.notes, width: 30 },
];

type DrawerState = { mode: 'create' } | { mode: 'edit'; record: Customer } | null;

const listConfig: ListUrlConfig = {
  allowedSortFields: sortFields,
  defaultSort: { field: 'createdAt', order: 'desc' },
  filterKeys: ['status', 'industry'],
  allowedFilterValues: {
    status: customerStatusOptions.map((option) => option.value),
    industry: industryOptions.map((option) => option.value),
  },
};

const pageMeta = routeDefinitions.find((route) => route.path === '/customers')!;

export default function CustomerListPage() {
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const [form] = Form.useForm<CustomerInput>();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);

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
  const query = listQuery as unknown as CustomerListQuery;
  const customersQuery = useCustomers(query);

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
    if (customersQuery.isFetching || !customersQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(customersQuery.data.total / state.pageSize));
    // Automatic normalisation must not create a history entry that traps Back.
    if (state.page > lastPage) setPage(lastPage, true);
  }, [customersQuery.data, customersQuery.isFetching, setPage, state.page, state.pageSize]);

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const { exportFiltered, exportRowsOf } = useDataExport({
    moduleName: '客户',
    sheetName: '客户',
    columns: exportColumns,
    getRows: () => fetchAllCustomers(query),
  });

  const openCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(customerFormDefaults);
    setDrawer({ mode: 'create' });
  };

  const openEdit = (record: Customer) => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(customerToFormValues(record));
    setDrawer({ mode: 'edit', record });
  };

  const closeDrawer = () => {
    setDrawer(null);
    form.resetFields();
    createMutation.reset();
    updateMutation.reset();
  };

  const submitForm = async (values: CustomerInput) => {
    const payload: CustomerInput = { ...values, notes: values.notes ?? '' };
    try {
      if (drawer?.mode === 'edit') {
        await updateMutation.mutateAsync({ id: drawer.record.id, input: payload });
        message.success(copy.messages.customerUpdated);
      } else {
        await createMutation.mutateAsync(payload);
        message.success(copy.messages.customerCreated);
      }
      closeDrawer();
    } catch (error) {
      // The inline alert shows the message; field details bind to matching inputs.
      applyServerFieldErrors(form, error);
    }
  };

  const confirmDelete = (record: Customer) => {
    confirm({
      title: `删除客户「${record.name}」？`,
      content: '删除后不可恢复。若该客户仍有关联项目或订单，系统会阻止删除并提示先调整关联数据。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(record.id);
          message.success(copy.messages.customerDeleted);
          setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
          setSelectedRows((rows) => rows.filter((row) => row.id !== record.id));
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const columns: DataTableColumns<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: true,
      render: (value: string, record) => <Link to={`/customers/${record.id}`}>{value}</Link>,
    },
    { title: '客户编码', dataIndex: 'code', key: 'code', width: 130, sorter: true },
    { title: '行业', dataIndex: 'industry', key: 'industry', width: 120, sorter: true },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 160,
      render: (_value: string, record) => (
        <Space orientation="vertical" size={0}>
          <span>{record.contactName}</span>
          <Typography.Text type="secondary" className="table-secondary">
            {record.phone}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 210, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: true,
      render: (_value: string, record) => <StatusTag kind="customer" value={record.status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: true,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      hideInSettings: true,
      render: (_value: unknown, record) => (
        <Space size={2}>
          <Link to={`/customers/${record.id}`}>详情</Link>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const submitting = createMutation.isPending || updateMutation.isPending;
  const mutationError = drawer?.mode === 'edit' ? updateMutation.error : createMutation.error;

  return (
    <>
      <ListPageTemplate
        header={{
          title: pageMeta.title,
          description: pageMeta.description,
          meta: (
            <Space wrap size={[6, 6]}>
              <Tag color="purple">{customersQuery.isPending ? '加载中…' : `${customersQuery.data?.total ?? 0} 位客户`}</Tag>
              <Typography.Text type="secondary">数据来自 MSW 内存模拟，刷新后重置</Typography.Text>
            </Space>
          ),
        }}
        filterBar={
          <SearchFilterBar
            keyword={keywordDraft}
            onKeywordChange={setKeywordDraft}
            onSearch={() => submitSearch()}
            onReset={reset}
            resetDisabled={!hasActiveQuery}
            loading={customersQuery.isFetching}
            placeholder="搜索名称、编码、联系人或邮箱"
            filters={
              <>
                <Select
                  allowClear
                  placeholder="客户状态"
                  aria-label="按客户状态筛选"
                  value={state.filters.status}
                  onChange={(value) => setFilter('status', value)}
                  options={customerStatusOptions}
                  style={{ width: 130 }}
                />
                <Select
                  allowClear
                  placeholder="所属行业"
                  aria-label="按行业筛选"
                  value={state.filters.industry}
                  onChange={(value) => setFilter('industry', value)}
                  options={industryOptions}
                  style={{ width: 140 }}
                />
              </>
            }
            resultSummary={
              customersQuery.isPending ? (
                '正在加载…'
              ) : (
                <>
                  共 {customersQuery.data?.total ?? 0} 条结果
                  {state.keyword ? `，关键词「${state.keyword}」` : ''}
                  {hasActiveFilters ? '（已应用筛选）' : ''}
                </>
              )
            }
            actions={
              <Space wrap size={8}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {copy.actions.newCustomer}
                </Button>
                <Button icon={<Upload size={15} />} onClick={() => setUploadOpen(true)}>
                  {copy.actions.importCustomers}
                </Button>
                <ExportButton onExport={exportFiltered} disabled={customersQuery.isFetching} />
              </Space>
            }
          />
        }
      >
        <DataTable<Customer>
          tableId="customers"
          tableLabel="客户列表"
          rowKey="id"
          columns={columns}
          dataSource={customersQuery.data?.items ?? []}
          loading={customersQuery.isFetching}
          error={customersQuery.error}
          onRetry={() => void customersQuery.refetch()}
          emptyTitle="暂无客户"
          emptyDescription="调整筛选条件，或创建第一位客户。"
          emptyAction={
            <Button type="primary" onClick={openCreate}>
              {copy.actions.newCustomer}
            </Button>
          }
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: customersQuery.data?.total ?? 0,
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
            <Typography.Text type="secondary">
              {selectedRows.length > 0
                ? `已选 ${selectedRows.length} 条`
                : '支持关键词、状态与行业组合筛选；导出覆盖当前筛选的全部结果'}
            </Typography.Text>
          }
        />
      </ListPageTemplate>

      <Drawer
        open={uploadOpen}
        title={copy.actions.importCustomersTitle}
        onClose={() => setUploadOpen(false)}
        size={560}
        styles={{ wrapper: { maxWidth: '100vw' } }}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setUploadOpen(false)}>关闭</Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary">
          演示文件校验、进度、成功与失败重试。所有处理仅发生在浏览器内，不会写入模拟数据。
        </Typography.Paragraph>
        <MockUpload
          accept=".csv,.xlsx"
          maxSizeMB={5}
          maxCount={3}
          onPreview={(file) => {
            message.info(`预览 ${file.name}（演示，不解析文件内容）`);
          }}
        />
      </Drawer>

      <CustomerFormDrawer
        open={drawer !== null}
        mode={drawer?.mode ?? 'create'}
        form={form}
        submitting={submitting}
        error={mutationError}
        onClose={closeDrawer}
        onFinish={submitForm}
      />
    </>
  );
}

function CustomerFormDrawer({
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
  form: FormInstance<CustomerInput>;
  submitting: boolean;
  error: unknown;
  onClose: () => void;
  onFinish: (values: CustomerInput) => void | Promise<void>;
}) {
  return (
    <FormDrawer<CustomerInput>
      open={open}
      title={mode === 'edit' ? copy.actions.quickEditCustomer : copy.actions.newCustomer}
      description={
        mode === 'edit'
          ? '快速修改基础资料；完整编辑请进入独立编辑页。'
          : '填写客户基础资料，保存后可继续补充关联业务。'
      }
      form={form}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onFinish={onFinish}
      submitText={mode === 'edit' ? copy.form.saveChanges : copy.actions.createCustomer}
    >
      <CustomerFormFields />
    </FormDrawer>
  );
}
