import { useEffect, useState, type Key } from 'react';
import { App, Button, DatePicker, Form, Select, Space, Tag, Typography, type FormInstance } from 'antd';
import { Plus } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { projectOwnerOptions, projectStatusOptions, projectStatusMeta } from '../../config/options';
import {
  ProjectFormFields,
  projectFormDefaults,
  projectToFormValues,
  projectValuesToInput,
  type ProjectFormValues,
} from '../../features/projects/components/ProjectFormFields';
import { CustomerSelect } from '../../features/customers/components/CustomerSelect';
import { fetchAllProjects } from '../../features/projects/api';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '../../features/projects/queries';
import type { Project, ProjectListQuery } from '../../types/entities';
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

const sortFields = ['name', 'code', 'owner', 'status', 'progress', 'startDate', 'endDate', 'budget', 'createdAt'] as const;

const exportColumns: Array<ExportColumn<Project>> = [
  { header: '项目名称', value: (row) => row.name, width: 24 },
  { header: '项目编码', value: (row) => row.code, width: 16 },
  { header: '关联客户', value: (row) => row.customer?.name ?? '（客户不存在）', width: 22 },
  { header: '负责人', value: (row) => row.owner, width: 12 },
  { header: '状态', value: (row) => projectStatusMeta[row.status]?.label ?? row.status, width: 12 },
  { header: '进度', value: (row) => `${row.progress}%`, width: 10 },
  { header: '开始日期', value: (row) => row.startDate, width: 14 },
  { header: '结束日期', value: (row) => row.endDate, width: 14 },
  { header: '预算（元）', value: (row) => row.budget, width: 16, numberFormat: '#,##0.00' },
  { header: '备注', value: (row) => row.notes, width: 30 },
];

type DrawerState = { mode: 'create' } | { mode: 'edit'; record: Project } | null;

const listConfig: ListUrlConfig = {
  allowedSortFields: sortFields,
  defaultSort: { field: 'createdAt', order: 'desc' },
  filterKeys: ['customerId', 'status', 'owner', 'startDateFrom', 'startDateTo'],
  dateFilterKeys: ['startDateFrom', 'startDateTo'],
  allowedFilterValues: {
    status: projectStatusOptions.map((option) => option.value),
    owner: projectOwnerOptions.map((option) => option.value),
  },
};

const pageMeta = routeDefinitions.find((route) => route.path === '/projects')!;

export default function ProjectListPage() {
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const [form] = Form.useForm<ProjectFormValues>();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Project[]>([]);

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
  const query = listQuery as unknown as ProjectListQuery;
  const projectsQuery = useProjects(query);
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
    if (projectsQuery.isFetching || !projectsQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(projectsQuery.data.total / state.pageSize));
    // Automatic normalisation must not create a history entry that traps Back.
    if (state.page > lastPage) setPage(lastPage, true);
  }, [projectsQuery.data, projectsQuery.isFetching, setPage, state.page, state.pageSize]);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const { exportFiltered, exportRowsOf } = useDataExport({
    moduleName: '项目',
    sheetName: '项目',
    columns: exportColumns,
    getRows: () => fetchAllProjects(query),
  });

  const openCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(projectFormDefaults);
    setDrawer({ mode: 'create' });
  };

  const openEdit = (record: Project) => {
    createMutation.reset();
    updateMutation.reset();
    form.resetFields();
    form.setFieldsValue(projectToFormValues(record));
    setDrawer({ mode: 'edit', record });
  };

  const closeDrawer = () => {
    setDrawer(null);
    form.resetFields();
    createMutation.reset();
    updateMutation.reset();
  };

  const submitForm = async (values: ProjectFormValues) => {
    try {
      if (drawer?.mode === 'edit') {
        await updateMutation.mutateAsync({ id: drawer.record.id, input: projectValuesToInput(values) });
        message.success(copy.messages.projectUpdated);
      } else {
        await createMutation.mutateAsync(projectValuesToInput(values));
        message.success(copy.messages.projectCreated);
      }
      closeDrawer();
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const confirmDelete = (record: Project) => {
    confirm({
      title: `删除项目「${record.name}」？`,
      content: '删除后不可恢复。若项目已被订单引用，系统会阻止删除并提示先调整关联订单。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(record.id);
          message.success(copy.messages.projectDeleted);
          setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
          setSelectedRows((rows) => rows.filter((row) => row.id !== record.id));
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const columns: DataTableColumns<Project> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: true,
      render: (value: string, record) => <Link to={`/projects/${record.id}`}>{value}</Link>,
    },
    { title: '编码', dataIndex: 'code', key: 'code', width: 150, sorter: true },
    {
      title: '关联客户',
      key: 'customer',
      width: 180,
      render: (_value: unknown, record) =>
        record.customer ? (
          <Link to={`/customers/${record.customer.id}`}>{record.customer.name}</Link>
        ) : (
          <Tag color="warning">客户不存在</Tag>
        ),
    },
    { title: '负责人', dataIndex: 'owner', key: 'owner', width: 100, sorter: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: true,
      render: (_value: string, record) => <StatusTag kind="project" value={record.status} />,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 90,
      sorter: true,
      render: (value: number) => `${value}%`,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      sorter: true,
      render: (value: string) => formatDate(value),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      sorter: true,
      render: (value: string) => formatDate(value),
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      sorter: true,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right',
      hideInSettings: true,
      render: (_value: unknown, record) => (
        <Space size={2}>
          <Link to={`/projects/${record.id}`}>详情</Link>
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
    state.filters.startDateFrom || state.filters.startDateTo
      ? [
          state.filters.startDateFrom ? dayjs(state.filters.startDateFrom) : null,
          state.filters.startDateTo ? dayjs(state.filters.startDateTo) : null,
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
              <Tag color="blue">{projectsQuery.isPending ? '加载中…' : `${projectsQuery.data?.total ?? 0} 个项目`}</Tag>
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
            loading={projectsQuery.isFetching}
            placeholder="搜索项目名称、编码或负责人"
            filters={
              <>
                <div style={{ width: 200 }}>
                  <CustomerSelect
                    placeholder="关联客户"
                    value={state.filters.customerId}
                    onChange={(value) => setFilter('customerId', value)}
                  />
                </div>
                <Select
                  allowClear
                  placeholder="项目状态"
                  aria-label="按项目状态筛选"
                  value={state.filters.status}
                  onChange={(value) => setFilter('status', value)}
                  options={projectStatusOptions}
                  style={{ width: 130 }}
                />
                <Select
                  allowClear
                  placeholder="负责人"
                  aria-label="按负责人筛选"
                  value={state.filters.owner}
                  onChange={(value) => setFilter('owner', value)}
                  options={projectOwnerOptions}
                  style={{ width: 120 }}
                />
                <DatePicker.RangePicker
                  aria-label="按开始日期范围筛选"
                  value={dateRange}
                  onChange={(dates) =>
                    setFilters({
                      startDateFrom: dates?.[0]?.format('YYYY-MM-DD'),
                      startDateTo: dates?.[1]?.format('YYYY-MM-DD'),
                    })
                  }
                  placeholder={['开始日期起', '开始日期止']}
                  style={{ width: 250 }}
                />
              </>
            }
            resultSummary={
              projectsQuery.isPending ? (
                '正在加载…'
              ) : (
                <>
                  共 {projectsQuery.data?.total ?? 0} 条结果
                  {state.keyword ? `，关键词「${state.keyword}」` : ''}
                  {hasActiveFilters ? '（已应用筛选）' : ''}
                </>
              )
            }
            actions={
              <Space wrap size={8}>
                <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>
                  {copy.actions.newProject}
                </Button>
                <ExportButton onExport={exportFiltered} disabled={projectsQuery.isFetching} />
              </Space>
            }
          />
        }
      >
        <DataTable<Project>
          tableId="projects"
          tableLabel="项目列表"
          rowKey="id"
          columns={columns}
          dataSource={projectsQuery.data?.items ?? []}
          loading={projectsQuery.isFetching}
          error={projectsQuery.error}
          onRetry={() => void projectsQuery.refetch()}
          emptyTitle="暂无项目"
          emptyDescription="调整筛选条件，或创建第一个项目。"
          emptyAction={
            <Button type="primary" onClick={openCreate}>
              {copy.actions.newProject}
            </Button>
          }
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: projectsQuery.data?.total ?? 0,
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
                : '支持客户、状态、负责人和日期范围组合筛选'}
            </Typography.Text>
          }
        />
      </ListPageTemplate>

      <ProjectFormDrawer
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

function ProjectFormDrawer({
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
  form: FormInstance<ProjectFormValues>;
  submitting: boolean;
  error: unknown;
  onClose: () => void;
  onFinish: (values: ProjectFormValues) => void | Promise<void>;
}) {
  return (
    <FormDrawer<ProjectFormValues>
      open={open}
      title={mode === 'edit' ? copy.actions.quickEditProject : copy.actions.newProject}
      description={
        mode === 'edit'
          ? '快速修改项目基础信息；复杂编辑请进入独立页面。'
          : '选择关联客户并填写项目周期、预算等信息。'
      }
      width={620}
      form={form}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onFinish={onFinish}
      submitText={mode === 'edit' ? copy.form.saveChanges : copy.actions.createProject}
    >
      <ProjectFormFields />
    </FormDrawer>
  );
}
