import { useEffect, useRef } from 'react';
import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { orderStatusOptions } from '../../../config/options';
import type { Order, OrderInput } from '../../../types/entities';
import { CustomerSelect } from '../../customers/components/CustomerSelect';
import { ProjectSelect } from '../../projects/components/ProjectSelect';

export interface OrderFormValues extends Omit<OrderInput, 'orderDate' | 'dueDate'> {
  orderDate: Dayjs;
  dueDate: Dayjs;
}

export const orderFormDefaults: Partial<OrderFormValues> = {
  status: 'pending',
  orderDate: dayjs(),
  dueDate: dayjs().add(30, 'day'),
  notes: '',
  projectId: '',
};

export function orderToFormValues(order: Order): OrderFormValues {
  return {
    orderNo: order.orderNo,
    customerId: order.customerId,
    projectId: order.projectId,
    amount: order.amount,
    status: order.status,
    orderDate: dayjs(order.orderDate),
    dueDate: dayjs(order.dueDate),
    notes: order.notes,
  };
}

export function orderValuesToInput(values: OrderFormValues): OrderInput {
  return {
    orderNo: values.orderNo,
    customerId: values.customerId,
    projectId: values.projectId ?? '',
    amount: values.amount,
    status: values.status,
    orderDate: values.orderDate.format('YYYY-MM-DD'),
    dueDate: values.dueDate.format('YYYY-MM-DD'),
    notes: values.notes ?? '',
  };
}

export function OrderFormFields() {
  const form = Form.useFormInstance<OrderFormValues>();
  const customerId = Form.useWatch('customerId', form);
  const previousCustomerId = useRef(customerId);

  // Keep the project reference consistent when the customer is changed by the user.
  useEffect(() => {
    if (previousCustomerId.current !== undefined && previousCustomerId.current !== customerId) {
      form.setFieldValue('projectId', '');
    }
    previousCustomerId.current = customerId;
  }, [customerId, form]);

  return (
    <>
      <Form.Item
        name="orderNo"
        label="订单号"
        rules={[
          { required: true, message: '请输入订单号' },
          { pattern: /^[A-Za-z0-9-]{4,32}$/, message: '订单号需为 4-32 位字母、数字或短横线' },
        ]}
      >
        <Input placeholder="例如：ORD-2026-0037" maxLength={32} />
      </Form.Item>
      <Form.Item name="status" label="订单状态" rules={[{ required: true, message: '请选择订单状态' }]}>
        <Select placeholder="选择状态" options={orderStatusOptions} />
      </Form.Item>
      <Form.Item name="customerId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
        <CustomerSelect placeholder="搜索并选择客户" />
      </Form.Item>
      <Form.Item name="projectId" label="关联项目（可选）">
        <ProjectSelect customerId={customerId} />
      </Form.Item>
      <Form.Item
        name="amount"
        label="订单金额"
        rules={[{ required: true, message: '请输入订单金额' }]}
      >
        <InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} />
      </Form.Item>
      <div aria-hidden="true" />
      <Form.Item
        name="orderDate"
        label="下单日期"
        rules={[{ required: true, message: '请选择下单日期' }]}
      >
        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name="dueDate"
        label="到期日期"
        dependencies={['orderDate']}
        rules={[
          { required: true, message: '请选择到期日期' },
          {
            validator: async (_, value: Dayjs | undefined) => {
              const orderDate = form.getFieldValue('orderDate') as Dayjs | undefined;
              if (value && orderDate && value.isBefore(orderDate, 'day')) {
                throw new Error('到期日期不能早于下单日期');
              }
            },
          },
        ]}
      >
        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name="notes"
        label="备注"
        className="form-span-full"
        rules={[{ max: 500, message: '备注最多 500 个字符' }]}
      >
        <Input.TextArea rows={3} placeholder="补充说明（可选）" maxLength={500} showCount />
      </Form.Item>
    </>
  );
}
