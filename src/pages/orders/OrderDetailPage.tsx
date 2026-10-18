import { Alert, App, Button, Space, Tag } from 'antd';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDeleteOrder, useOrder } from '../../features/orders/queries';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { getErrorMessage } from '../../lib/api/errors';
import { formatCurrency, formatDate, formatDateTime, formatNullable } from '../../utils/format';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState/AsyncState';
import { DetailFields, DetailSection } from '../../components/DetailFields/DetailFields';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { copy } from '../../config/copy';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const orderQuery = useOrder(id);
  const deleteMutation = useDeleteOrder();

  if (orderQuery.isPending) return <LoadingState label="正在加载订单详情…" />;
  if (orderQuery.error) {
    return <ErrorState error={orderQuery.error} title="订单详情加载失败" onRetry={() => void orderQuery.refetch()} />;
  }
  if (!orderQuery.data) return <EmptyState title="订单不存在" description="该订单可能已被删除。" />;

  const order = orderQuery.data;

  const handleDelete = () => {
    confirm({
      title: `删除订单「${order.orderNo}」？`,
      content: '删除后不可恢复，仪表盘统计也会随之更新。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(order.id);
          message.success(copy.messages.orderDeleted);
          navigate('/orders');
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        titleSuffix={<StatusTag kind="order" value={order.status} />}
        description={`${order.customer?.name ?? '客户不存在'} · 下单日期 ${formatDate(order.orderDate)}`}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/orders')}>
              {copy.common.backToList}
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => navigate(`/orders/${order.id}/edit`)}>
              {copy.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={15} />} onClick={handleDelete} loading={deleteMutation.isPending}>
              {copy.common.delete}
            </Button>
          </Space>
        }
      />

      {!order.customer && (
        <Alert
          type="warning"
          showIcon
          className="detail-alert"
          title="关联客户不可用"
          description="该订单的关联客户不存在或已被删除，请编辑订单重新选择客户。"
        />
      )}
      {order.projectId && !order.project && (
        <Alert
          type="warning"
          showIcon
          className="detail-alert"
          title="关联项目不可用"
          description="该订单的关联项目已被删除。可在编辑页重新选择项目，或保留为空。"
        />
      )}

      <DetailSection title="订单信息">
        <DetailFields
          items={[
            { key: 'orderNo', label: '订单号', children: order.orderNo },
            {
              key: 'customer',
              label: '客户',
              children: order.customer ? (
                <Link to={`/customers/${order.customer.id}`}>{order.customer.name}</Link>
              ) : (
                <Tag color="warning">客户不存在</Tag>
              ),
            },
            {
              key: 'project',
              label: '关联项目',
              children: order.project ? (
                <Link to={`/projects/${order.project.id}`}>{order.project.name}</Link>
              ) : order.projectId ? (
                <Tag color="warning">项目已删除</Tag>
              ) : (
                '未关联项目'
              ),
            },
            {
              key: 'status',
              label: '订单状态',
              children: <StatusTag kind="order" value={order.status} />,
            },
            { key: 'amount', label: '订单金额', children: formatCurrency(order.amount) },
            { key: 'orderDate', label: '下单日期', children: formatDate(order.orderDate) },
            { key: 'dueDate', label: '到期日期', children: formatDate(order.dueDate) },
            { key: 'created', label: '创建时间', children: formatDateTime(order.createdAt) },
            { key: 'updated', label: '更新时间', children: formatDateTime(order.updatedAt) },
            { key: 'notes', label: '备注', children: formatNullable(order.notes) },
          ]}
        />
      </DetailSection>

      <DetailSection title="金额说明">
        <Space orientation="vertical" size={4}>
          <span>本订单金额：<strong>{formatCurrency(order.amount)}</strong></span>
          <span style={{ color: 'var(--ant-color-text-secondary)' }}>
            金额以人民币展示；演示数据不做税费或汇率计算。
          </span>
        </Space>
      </DetailSection>
    </div>
  );
}
