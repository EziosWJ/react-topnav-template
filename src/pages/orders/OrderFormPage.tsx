import { useEffect } from 'react';
import { App, Button, Form } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  OrderFormFields,
  orderFormDefaults,
  orderToFormValues,
  orderValuesToInput,
  type OrderFormValues,
} from '../../features/orders/components/OrderFormFields';
import { useCreateOrder, useOrder, useUpdateOrder } from '../../features/orders/queries';
import { copy } from '../../config/copy';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FormPage } from '../../components/FormPage/FormPage';
import { ErrorState, LoadingState } from '../../components/AsyncState/AsyncState';
import { applyServerFieldErrors } from '../../lib/forms';


export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<OrderFormValues>();
  const orderQuery = useOrder(id);
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();

  useEffect(() => {
    if (isEdit && orderQuery.data) {
      form.setFieldsValue(orderToFormValues(orderQuery.data));
    } else if (!isEdit) {
      form.setFieldsValue(orderFormDefaults);
    }
  }, [form, isEdit, orderQuery.data]);

  if (isEdit && orderQuery.isPending) return <LoadingState label="正在加载订单资料…" />;
  if (isEdit && orderQuery.error) {
    return <ErrorState error={orderQuery.error} title="订单资料加载失败" onRetry={() => void orderQuery.refetch()} />;
  }
  if (isEdit && !orderQuery.data) {
    return <ErrorState error={new Error('订单不存在或已被删除')} title="无法编辑订单" />;
  }

  const handleFinish = async (values: OrderFormValues) => {
    const payload = orderValuesToInput(values);
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, input: payload });
        message.success('订单已更新');
        navigate(`/orders/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        message.success('订单已创建');
        navigate(`/orders/${created.id}`);
      }
    } catch (error) {
      applyServerFieldErrors(form, error);
    }
  };

  const handleCancel = () => {
    if (isEdit && id) navigate(`/orders/${id}`);
    else navigate('/orders');
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? `${copy.actions.editOrder}${orderQuery.data ? `：${orderQuery.data.orderNo}` : ''}` : copy.actions.newOrder}
        description={isEdit ? '更新订单金额、状态和日期。' : '选择客户并填写金额、状态和日期；项目关联为可选项。'}
        extra={
          <Button icon={<ArrowLeft size={15} />} onClick={handleCancel}>
            返回
          </Button>
        }
      />
      <FormPage<OrderFormValues>
        form={form}
        onFinish={handleFinish}
        onCancel={handleCancel}
        submitting={createMutation.isPending || updateMutation.isPending}
        error={isEdit ? updateMutation.error : createMutation.error}
        submitText={isEdit ? copy.form.saveChanges : copy.actions.createOrder}
      >
        <OrderFormFields />
      </FormPage>
    </div>
  );
}
