import { useEffect } from 'react';
import { App, Button, Form } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserFormFields,
  userFormDefaults,
  userToFormValues,
} from '../../features/users/components/UserFormFields';
import { useCreateUser, useUpdateUser, useUser } from '../../features/users/queries';
import type { UserInput } from '../../types/entities';
import { copy } from '../../config/copy';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FormPage } from '../../components/FormPage/FormPage';
import { ErrorState, LoadingState } from '../../components/AsyncState/AsyncState';
import { applyServerFieldErrors } from '../../lib/forms';


export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<UserInput>();
  const userQuery = useUser(id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (isEdit && userQuery.data) {
      form.setFieldsValue(userToFormValues(userQuery.data));
    } else if (!isEdit) {
      form.setFieldsValue(userFormDefaults);
    }
  }, [form, isEdit, userQuery.data]);

  if (isEdit && userQuery.isPending) return <LoadingState label="正在加载用户资料…" />;
  if (isEdit && userQuery.error) {
    return <ErrorState error={userQuery.error} title="用户资料加载失败" onRetry={() => void userQuery.refetch()} />;
  }
  if (isEdit && !userQuery.data) {
    return <ErrorState error={new Error('用户不存在或已被删除')} title="无法编辑用户" />;
  }

  const handleFinish = async (values: UserInput) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input: values });
        message.success('用户资料已更新');
        navigate(`/users/${id}`);
      } else {
        const created = await createMutation.mutateAsync(values);
        message.success('用户已创建');
        navigate(`/users/${created.id}`);
      }
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const handleCancel = () => {
    if (isEdit && id) navigate(`/users/${id}`);
    else navigate('/users');
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? `${copy.actions.editUser}${userQuery.data ? `：${userQuery.data.name}` : ''}` : copy.actions.newUser}
        description={isEdit ? '更新业务用户资料。' : '填写业务用户资料，不涉及真实账号或密码。'}
        extra={
          <Button icon={<ArrowLeft size={15} />} onClick={handleCancel}>
            返回
          </Button>
        }
      />
      <FormPage<UserInput>
        form={form}
        onFinish={handleFinish}
        onCancel={handleCancel}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={isEdit ? updateMutation.error : createMutation.error}
        submitText={isEdit ? copy.form.saveChanges : copy.actions.createUser}
      >
        <UserFormFields />
      </FormPage>
    </div>
  );
}
