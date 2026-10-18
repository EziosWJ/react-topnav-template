import { App, Button, Space, Table, Typography } from 'antd';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomer, useCustomerReferences, useDeleteCustomer } from '../../features/customers/queries';
import { useOrders } from '../../features/orders/queries';
import { useProjects } from '../../features/projects/queries';
import type { Order, Project } from '../../types/entities';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { getErrorMessage } from '../../lib/api/errors';
import { formatCurrency, formatDate, formatDateTime, formatNullable } from '../../utils/format';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/AsyncState/AsyncState';
import { DetailFields, DetailSection } from '../../components/DetailFields/DetailFields';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { copy } from '../../config/copy';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const customerQuery = useCustomer(id);
  const referencesQuery = useCustomerReferences(id);
  const projectsQuery = useProjects({ page: 1, pageSize: 5, customerId: id, sortBy: 'startDate', sortOrder: 'desc' });
  const ordersQuery = useOrders({ page: 1, pageSize: 5, customerId: id, sortBy: 'orderDate', sortOrder: 'desc' });
  const deleteMutation = useDeleteCustomer();

  if (customerQuery.isPending) return <LoadingState label="正在加载客户详情…" />;
  if (customerQuery.error) {
    return <ErrorState error={customerQuery.error} title="客户详情加载失败" onRetry={() => void customerQuery.refetch()} />;
  }
  if (!customerQuery.data) return <EmptyState title="客户不存在" description="该客户可能已被删除。" />;

  const customer = customerQuery.data;
  const references = referencesQuery.data;

  const handleDelete = () => {
    confirm({
      title: `删除客户「${customer.name}」？`,
      content:
        references && (references.projects.length > 0 || references.orders.length > 0)
          ? `该客户关联 ${references.projects.length} 个项目、${references.orders.length} 个订单，删除将被服务端阻止。`
          : '删除后不可恢复。若仍有关联项目或订单，系统会阻止删除。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(customer.id);
          message.success(copy.messages.customerDeleted);
          navigate('/customers');
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const projectColumns = [
    {
      title: '项目',
      dataIndex: 'name',
      render: (value: string, record: Project) => <Link to={`/projects/${record.id}`}>{value}</Link>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_: unknown, record: Project) => <StatusTag kind="project" value={record.status} />,
    },
    { title: '进度', dataIndex: 'progress', width: 90, render: (value: number) => `${value}%` },
    { title: '开始日期', dataIndex: 'startDate', width: 120, render: (value: string) => formatDate(value) },
  ];

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      render: (value: string, record: Order) => <Link to={`/orders/${record.id}`}>{value}</Link>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_: unknown, record: Order) => <StatusTag kind="order" value={record.status} />,
    },
    { title: '金额', dataIndex: 'amount', width: 140, align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { title: '下单日期', dataIndex: 'orderDate', width: 120, render: (value: string) => formatDate(value) },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        titleSuffix={<StatusTag kind="customer" value={customer.status} />}
        description={`${customer.code} · ${customer.industry}`}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/customers')}>
              {copy.common.backToList}
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => navigate(`/customers/${customer.id}/edit`)}>
              {copy.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={15} />} onClick={handleDelete} loading={deleteMutation.isPending}>
              {copy.common.delete}
            </Button>
          </Space>
        }
      />

      <DetailSection title="基本信息">
        <DetailFields
          items={[
            { key: 'code', label: '客户编码', children: customer.code },
            { key: 'industry', label: '所属行业', children: customer.industry },
            { key: 'contact', label: '联系人', children: customer.contactName },
            { key: 'phone', label: '联系电话', children: customer.phone },
            { key: 'email', label: '邮箱', children: customer.email },
            { key: 'created', label: '创建时间', children: formatDateTime(customer.createdAt) },
            { key: 'updated', label: '更新时间', children: formatDateTime(customer.updatedAt) },
            { key: 'notes', label: '备注', children: formatNullable(customer.notes) },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="关联项目"
        extra={
          <Space>
            <Typography.Text type="secondary">共 {references?.projects.length ?? projectsQuery.data?.total ?? 0} 个</Typography.Text>
            <Link to={`/projects?customerId=${customer.id}`}>查看全部</Link>
          </Space>
        }
      >
        {projectsQuery.isPending ? (
          <LoadingState label="正在加载关联项目…" rows={2} />
        ) : projectsQuery.error ? (
          <ErrorState error={projectsQuery.error} onRetry={() => void projectsQuery.refetch()} />
        ) : (projectsQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="暂无关联项目"
            description="创建项目并选择该客户后，会在这里展示。"
            action={<Link to="/projects/new">{copy.actions.newProject}</Link>}
          />
        ) : (
          <Table<Project>
            rowKey="id"
            size="small"
            columns={projectColumns}
            dataSource={projectsQuery.data?.items ?? []}
            pagination={false}
            scroll={{ x: 620 }}
          />
        )}
      </DetailSection>

      <DetailSection
        title="关联订单"
        extra={
          <Space>
            <Typography.Text type="secondary">共 {references?.orders.length ?? ordersQuery.data?.total ?? 0} 个</Typography.Text>
            <Link to={`/orders?customerId=${customer.id}`}>查看全部</Link>
          </Space>
        }
      >
        {ordersQuery.isPending ? (
          <LoadingState label="正在加载关联订单…" rows={2} />
        ) : ordersQuery.error ? (
          <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
        ) : (ordersQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="暂无关联订单"
            description="创建订单并选择该客户后，会在这里展示。"
            action={<Link to="/orders/new">{copy.actions.newOrder}</Link>}
          />
        ) : (
          <Table<Order>
            rowKey="id"
            size="small"
            columns={orderColumns}
            dataSource={ordersQuery.data?.items ?? []}
            pagination={false}
            scroll={{ x: 560 }}
          />
        )}
      </DetailSection>
    </div>
  );
}
