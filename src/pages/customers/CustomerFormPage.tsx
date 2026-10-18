import { useEffect } from 'react';
import { App, Button, Form } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CustomerFormFields,
  customerFormDefaults,
  customerToFormValues,
} from '../../features/customers/components/CustomerFormFields';
import { useCreateCustomer, useCustomer, useUpdateCustomer } from '../../features/customers/queries';
import type { CustomerInput } from '../../types/entities';
import { copy } from '../../config/copy';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FormPage } from '../../components/FormPage/FormPage';
import { LoadingState, ErrorState } from '../../components/AsyncState/AsyncState';
import { applyServerFieldErrors } from '../../lib/forms';


export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<CustomerInput>();
  const customerQuery = useCustomer(id);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  useEffect(() => {
    if (isEdit && customerQuery.data) {
      form.setFieldsValue(customerToFormValues(customerQuery.data));
    } else if (!isEdit) {
      form.setFieldsValue(customerFormDefaults);
    }
  }, [customerQuery.data, form, isEdit]);

  if (isEdit && customerQuery.isPending) {
    return <LoadingState label="正在加载客户资料…" />;
  }
  if (isEdit && customerQuery.error) {
    return (
      <ErrorState
        error={customerQuery.error}
        title="客户资料加载失败"
        onRetry={() => void customerQuery.refetch()}
      />
    );
  }
  if (isEdit && !customerQuery.data) {
    return <ErrorState error={new Error('客户不存在或已被删除')} title="无法编辑客户" />;
  }

  const handleFinish = async (values: CustomerInput) => {
    const payload: CustomerInput = { ...values, notes: values.notes ?? '' };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input: payload });
        message.success('客户资料已更新');
        navigate(`/customers/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        message.success('客户已创建');
        navigate(`/customers/${created.id}`);
      }
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const handleCancel = () => {
    if (isEdit && id) navigate(`/customers/${id}`);
    else navigate('/customers');
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? `${copy.actions.editCustomer}${customerQuery.data ? `：${customerQuery.data.name}` : ''}` : copy.actions.newCustomer}
        description={isEdit ? '更新客户资料，保存后返回详情页。' : '创建客户档案，保存后进入详情页继续查看关联业务。'}
        extra={
          <Button icon={<ArrowLeft size={15} />} onClick={handleCancel}>
            返回
          </Button>
        }
      />
      <FormPage<CustomerInput>
        form={form}
        onFinish={handleFinish}
        onCancel={handleCancel}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={isEdit ? updateMutation.error : createMutation.error}
        submitText={isEdit ? copy.form.saveChanges : copy.actions.createCustomer}
      >
        <CustomerFormFields />
      </FormPage>
    </div>
  );
}
