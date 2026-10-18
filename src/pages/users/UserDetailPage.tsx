import { Alert, App, Button, Space } from 'antd';
import { ArrowLeft, Pencil, Power, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteUser, useUpdateUser, useUser } from '../../features/users/queries';
import { userToFormValues } from '../../features/users/components/UserFormFields';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { getErrorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../utils/format';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState/AsyncState';
import { DetailFields, DetailSection } from '../../components/DetailFields/DetailFields';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { copy } from '../../config/copy';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const confirm = useConfirmAction();
  const userQuery = useUser(id);
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();

  if (userQuery.isPending) return <LoadingState label="正在加载用户详情…" />;
  if (userQuery.error) {
    return <ErrorState error={userQuery.error} title="用户详情加载失败" onRetry={() => void userQuery.refetch()} />;
  }
  if (!userQuery.data) return <EmptyState title="用户不存在" description="该用户可能已被删除。" />;

  const user = userQuery.data;
  const nextStatus = user.status === 'active' ? 'disabled' : 'active';

  const applyStatus = async () => {
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        input: { ...userToFormValues(user), status: nextStatus },
      });
      message.success(nextStatus === 'active' ? copy.messages.userEnabled : copy.messages.userDisabled);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleStatus = () => {
    if (nextStatus === 'disabled') {
      confirm({
        title: `停用用户「${user.name}」？`,
        content: '这是业务资料状态的演示操作，不涉及真实账号或登录权限。',
        okText: '停用',
        danger: true,
        onConfirm: applyStatus,
      });
    } else {
      void applyStatus();
    }
  };

  const handleDelete = () => {
    confirm({
      title: `删除用户「${user.name}」？`,
      content: '删除后不可恢复。本演示不包含真实账号、密码或权限生命周期。',
      okText: '删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(user.id);
          message.success(copy.messages.userDeleted);
          navigate('/users');
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        title={user.name}
        titleSuffix={<StatusTag kind="user" value={user.status} />}
        description={`@${user.username} · ${user.department} · ${user.role}`}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/users')}>
              {copy.common.backToList}
            </Button>
            <Button icon={<Power size={15} />} onClick={handleStatus} loading={updateMutation.isPending}>
              {nextStatus === 'active' ? '启用用户' : '停用用户'}
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => navigate(`/users/${user.id}/edit`)}>
              {copy.common.edit}
            </Button>
            <Button danger icon={<Trash2 size={15} />} onClick={handleDelete} loading={deleteMutation.isPending}>
              {copy.common.delete}
            </Button>
          </Space>
        }
      />

      <Alert
        type="info"
        showIcon
        className="detail-alert"
        title="演示说明"
        description="这里管理的是业务用户资料，不包含真实登录、密码管理、认证或权限控制。"
      />

      <DetailSection title="用户资料">
        <DetailFields
          items={[
            { key: 'name', label: '姓名', children: user.name },
            { key: 'username', label: '用户名', children: user.username },
            { key: 'email', label: '邮箱', children: user.email },
            { key: 'department', label: '部门', children: user.department },
            { key: 'role', label: '角色/岗位', children: user.role },
            { key: 'status', label: '状态', children: <StatusTag kind="user" value={user.status} /> },
            {
              key: 'lastLogin',
              label: '最近登录',
              children: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '从未登录',
            },
            { key: 'created', label: '创建时间', children: formatDateTime(user.createdAt) },
            { key: 'updated', label: '更新时间', children: formatDateTime(user.updatedAt) },
          ]}
        />
      </DetailSection>
    </div>
  );
}
