import { Alert, App, Button, Progress, Space, Table, Tag, Typography } from 'antd';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDeleteProject, useProject } from '../../features/projects/queries';
import { useOrders } from '../../features/orders/queries';
import type { Order } from '../../types/entities';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { getErrorMessage } from '../../lib/api/errors';
import { formatCurrency, formatDate, formatDateTime, formatNullable } from '../../utils/format';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '../../components/AsyncState/AsyncState';
import { DetailFields, DetailSection } from '../../components/DetailFields/DetailFields';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { copy } from '../../config/copy';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const projectQuery = useProject(id);
  const ordersQuery = useOrders({ page: 1, pageSize: 5, projectId: id, sortBy: 'orderDate', sortOrder: 'desc' });
  const deleteMutation = useDeleteProject();

  if (projectQuery.isPending) return <LoadingState label="正在加载项目详情…" />;
  if (projectQuery.error) {
    return <ErrorState error={projectQuery.error} title="项目详情加载失败" onRetry={() => void projectQuery.refetch()} />;
  }
  if (!projectQuery.data) return <EmptyState title="项目不存在" description="该项目可能已被删除。" />;

  const project = projectQuery.data;

  const handleDelete = () => {
    confirm({
      title: `删除项目「${project.name}」？`,
      content: '删除后不可恢复。若项目已被订单引用，系统会阻止删除。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(project.id);
          message.success(copy.messages.projectDeleted);
          navigate('/projects');
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

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
    {
      title: '金额',
      dataIndex: 'amount',
      width: 140,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
    { title: '下单日期', dataIndex: 'orderDate', width: 120, render: (value: string) => formatDate(value) },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        titleSuffix={<StatusTag kind="project" value={project.status} />}
        description={`${project.code} · 负责人 ${project.owner}`}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/projects')}>
              {copy.common.backToList}
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => navigate(`/projects/${project.id}/edit`)}>
              {copy.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={15} />} onClick={handleDelete} loading={deleteMutation.isPending}>
              {copy.common.delete}
            </Button>
          </Space>
        }
      />

      {!project.customer && (
        <Alert
          type="warning"
          showIcon
          className="detail-alert"
          title="关联客户不可用"
          description="该项目的关联客户不存在或已被删除。请在编辑页重新选择客户，或返回列表检查数据。"
        />
      )}

      <DetailSection title="项目信息">
        <DetailFields
          items={[
            { key: 'code', label: '项目编码', children: project.code },
            { key: 'owner', label: '负责人', children: project.owner },
            {
              key: 'customer',
              label: '关联客户',
              children: project.customer ? (
                <Link to={`/customers/${project.customer.id}`}>{project.customer.name}</Link>
              ) : (
                <Tag color="warning">客户不存在</Tag>
              ),
            },
            {
              key: 'status',
              label: '项目状态',
              children: <StatusTag kind="project" value={project.status} />,
            },
            { key: 'start', label: '开始日期', children: formatDate(project.startDate) },
            { key: 'end', label: '结束日期', children: formatDate(project.endDate) },
            { key: 'budget', label: '预算', children: formatCurrency(project.budget) },
            { key: 'created', label: '创建时间', children: formatDateTime(project.createdAt) },
            { key: 'updated', label: '更新时间', children: formatDateTime(project.updatedAt) },
            { key: 'notes', label: '备注', children: formatNullable(project.notes) },
            {
              key: 'progress',
              label: '项目进度',
              span: 2,
              children: (
                <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                  <Progress percent={project.progress} status={project.status === 'canceled' ? 'exception' : undefined} />
                  <Typography.Text type="secondary">当前完成度 {project.progress}%</Typography.Text>
                </Space>
              ),
            },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="关联订单"
        extra={
          <Space>
            <Typography.Text type="secondary">共 {ordersQuery.data?.total ?? 0} 个</Typography.Text>
            <Link to={`/orders?projectId=${project.id}`}>查看全部</Link>
          </Space>
        }
      >
        {ordersQuery.isPending ? (
          <LoadingState label="正在加载关联订单…" rows={2} />
        ) : ordersQuery.error ? (
          <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
        ) : (ordersQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="暂无关联订单" description="创建订单并选择该项目后，会在这里展示。" />
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
