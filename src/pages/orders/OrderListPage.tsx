import { useEffect, useState, type Key } from 'react';
import { App, Button, DatePicker, Form, Select, Space, Tag, Typography, type FormInstance } from 'antd';
import { Plus } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { orderStatusMeta, orderStatusOptions } from '../../config/options';
import {
  OrderFormFields,
  orderFormDefaults,
  orderToFormValues,
  orderValuesToInput,
  type OrderFormValues,
} from '../../features/orders/components/OrderFormFields';
import { CustomerSelect } from '../../features/customers/components/CustomerSelect';
import { fetchAllOrders } from '../../features/orders/api';
import {
  useCreateOrder,
  useDeleteOrder,
  useOrders,
  useUpdateOrder,
} from '../../features/orders/queries';
import type { Order, OrderListQuery } from '../../types/entities';
import { useListUrlState, type ListUrlConfig } from '../../hooks/useListUrlState';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useDataExport } from '../../hooks/useDataExport';
import { getErrorMessage } from '../../lib/api/errors';
import { formatCurrency, formatDate } from '../../utils/format';
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

const sortFields = ['orderNo', 'amount', 'status', 'orderDate', 'dueDate', 'createdAt'] as const;

const exportColumns: Array<ExportColumn<Order>> = [
  { header: '订单号', value: (row) => row.orderNo, width: 20 },
  { header: '客户', value: (row) => row.customer?.name ?? '（客户不存在）', width: 22 },
  { header: '关联项目', value: (row) => row.project?.name ?? '', width: 22 },
  { header: '金额（元）', value: (row) => row.amount, width: 16, numberFormat: '#,##0.00' },
  { header: '状态', value: (row) => orderStatusMeta[row.status]?.label ?? row.status, width: 12 },
  { header: '下单日期', value: (row) => row.orderDate, width: 14 },
  { header: '到期日期', value: (row) => row.dueDate, width: 14 },
  { header: '备注', value: (row) => row.notes, width: 30 },
];

type DrawerState = { mode: 'create' } | { mode: 'edit'; record: Order } | null;

const listConfig: ListUrlConfig = {
  allowedSortFields: sortFields,
  defaultSort: { field: 'createdAt', order: 'desc' },
  filterKeys: ['status', 'customerId', 'projectId', 'orderDateFrom', 'orderDateTo'],
  dateFilterKeys: ['orderDateFrom', 'orderDateTo'],
  allowedFilterValues: { status: orderStatusOptions.map((option) => option.value) },
};

const pageMeta = routeDefinitions.find((route) => route.path === '/orders')!;

export default function OrderListPage() {
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const [form] = Form.useForm<OrderFormValues>();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Order[]>([]);

  const {
    state,
    listQuery,
    keywordDraft,
    setKeywordDraft,
    submitSearch,
    setFilter,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    reset,
    hasActiveFilters,
    hasActiveQuery,
  } = useListUrlState(listConfig);
  const query = listQuery as unknown as OrderListQuery;
  const ordersQuery = useOrders(query);
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
    if (ordersQuery.isFetching || !ordersQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(ordersQuery.data.total / state.pageSize));
    // Automatic normalisation must not create a history entry that traps Back.
    if (state.page > lastPage) setPage(lastPage, true);
  }, [ordersQuery.data, ordersQuery.isFetching, setPage, state.page, state.pageSize]);

  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();
  const deleteMutation = useDeleteOrder();
  const { exportFiltered, exportRowsOf } = useDataExport({
    moduleName: '订单',
    sheetName: '订单',
    columns: exportColumns,
    getRows: () => fetchAllOrders(query),
  });

  const openCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(orderFormDefaults);
    setDrawer({ mode: 'create' });
  };

  const openEdit = (record: Order) => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(orderToFormValues(record));
    setDrawer({ mode: 'edit', record });
  };

  const closeDrawer = () => {
    setDrawer(null);
    form.resetFields();
    createMutation.reset();
    updateMutation.reset();
  };

  const submitForm = async (values: OrderFormValues) => {
    try {
      if (drawer?.mode === 'edit') {
        await updateMutation.mutateAsync({ id: drawer.record.id, input: orderValuesToInput(values) });
        message.success(copy.messages.orderUpdated);
      } else {
        await createMutation.mutateAsync(orderValuesToInput(values));
        message.success(copy.messages.orderCreated);
      }
      closeDrawer();
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const confirmDelete = (record: Order) => {
    confirm({
      title: `删除订单「${record.orderNo}」？`,
      content: '删除后不可恢复，仪表盘统计也会随之更新。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(record.id);
          message.success(copy.messages.orderDeleted);
          setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
          setSelectedRows((rows) => rows.filter((row) => row.id !== record.id));
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const columns: DataTableColumns<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 170,
      sorter: true,
      render: (value: string, record) => <Link to={`/orders/${record.id}`}>{value}</Link>,
    },
    {
      title: '客户',
      key: 'customer',
      width: 180,
      render: (_value: unknown, record) =>
        record.customer ? (
          <Link to={`/customers/${record.customer.id}`}>{record.customer.name}</Link>
        ) : (
          <Tag color="warning">客户不存在</Tag>
        ),
    },
    {
      title: '关联项目',
      key: 'project',
      width: 170,
      render: (_value: unknown, record) => {
        if (record.project) return <Link to={`/projects/${record.project.id}`}>{record.project.name}</Link>;
        if (record.projectId) return <Tag color="warning">项目已删除</Tag>;
        return <Typography.Text type="secondary">未关联</Typography.Text>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      sorter: true,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: true,
      render: (_value: string, record) => <StatusTag kind="order" value={record.status} />,
    },
    {
      title: '下单日期',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      sorter: true,
      render: (value: string) => formatDate(value),
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      sorter: true,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      hideInSettings: true,
      render: (_value: unknown, record) => (
        <Space size={2}>
          <Link to={`/orders/${record.id}`}>详情</Link>
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

  const dateRange: [Dayjs | null, Dayjs | null] | null =
    state.filters.orderDateFrom || state.filters.orderDateTo
      ? [
          state.filters.orderDateFrom ? dayjs(state.filters.orderDateFrom) : null,
          state.filters.orderDateTo ? dayjs(state.filters.orderDateTo) : null,
        ]
      : null;

  return (
    <>
      <ListPageTemplate
        header={{
          title: pageMeta.title,
          description: pageMeta.description,
          meta: (
            <Space wrap size={[6, 6]}>
              <Tag color="gold">{ordersQuery.isPending ? '加载中…' : `${ordersQuery.data?.total ?? 0} 个订单`}</Tag>
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
            loading={ordersQuery.isFetching}
            placeholder="搜索订单号、客户或项目"
            filters={
              <>
                <div style={{ width: 200 }}>
                  <CustomerSelect
                    placeholder="客户"
                    value={state.filters.customerId}
                    onChange={(value) => setFilter('customerId', value)}
                  />
                </div>
                <Select
                  allowClear
                  placeholder="订单状态"
                  aria-label="按订单状态筛选"
                  value={state.filters.status}
                  onChange={(value) => setFilter('status', value)}
                  options={orderStatusOptions}
                  style={{ width: 130 }}
                />
                <DatePicker.RangePicker
                  aria-label="按下单日期范围筛选"
                  value={dateRange}
                  onChange={(dates) =>
                    setFilters({
                      orderDateFrom: dates?.[0]?.format('YYYY-MM-DD'),
                      orderDateTo: dates?.[1]?.format('YYYY-MM-DD'),
                    })
                  }
                  placeholder={['下单日期起', '下单日期止']}
                  style={{ width: 250 }}
                />
              </>
            }
            resultSummary={
              ordersQuery.isPending ? (
                '正在加载…'
              ) : (
                <>
                  共 {ordersQuery.data?.total ?? 0} 条结果
                  {state.keyword ? `，关键词「${state.keyword}」` : ''}
                  {hasActiveFilters ? '（已应用筛选）' : ''}
                </>
              )
            }
            actions={
              <Space wrap size={8}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {copy.actions.newOrder}
                </Button>
                <ExportButton onExport={exportFiltered} disabled={ordersQuery.isFetching} />
              </Space>
            }
          />
        }
      >
        <DataTable<Order>
          tableId="orders"
          tableLabel="订单列表"
          rowKey="id"
          columns={columns}
          dataSource={ordersQuery.data?.items ?? []}
          loading={ordersQuery.isFetching}
          error={ordersQuery.error}
          onRetry={() => void ordersQuery.refetch()}
          emptyTitle="暂无订单"
          emptyDescription="调整筛选条件，或创建第一个订单。"
          emptyAction={
            <Button type="primary" onClick={openCreate}>
              {copy.actions.newOrder}
            </Button>
          }
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: ordersQuery.data?.total ?? 0,
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
                : '支持客户、状态和下单日期范围组合筛选'}
            </Typography.Text>
          }
        />
      </ListPageTemplate>

      <OrderFormDrawer
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

function OrderFormDrawer({
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
  form: FormInstance<OrderFormValues>;
  submitting: boolean;
  error: unknown;
  onClose: () => void;
  onFinish: (values: OrderFormValues) => void | Promise<void>;
}) {
  return (
    <FormDrawer<OrderFormValues>
      open={open}
      title={mode === 'edit' ? copy.actions.quickEditOrder : copy.actions.newOrder}
      description={
        mode === 'edit'
          ? '快速修改订单基础信息；复杂编辑请进入独立页面。'
          : '选择客户后可关联该客户下的项目。'
      }
      width={620}
      form={form}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onFinish={onFinish}
      submitText={mode === 'edit' ? copy.form.saveChanges : copy.actions.createOrder}
    >
      <OrderFormFields />
    </FormDrawer>
  );
}
