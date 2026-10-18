import { Form, Input, Select } from 'antd';
import { customerStatusOptions, industryOptions } from '../../../config/options';
import type { Customer, CustomerInput } from '../../../types/entities';

export const customerFormDefaults: Partial<CustomerInput> = {
  status: 'active',
  notes: '',
};

export function customerToFormValues(customer: Customer): CustomerInput {
  return {
    name: customer.name,
    code: customer.code,
    industry: customer.industry,
    contactName: customer.contactName,
    phone: customer.phone,
    email: customer.email,
    status: customer.status,
    notes: customer.notes,
  };
}

export function CustomerFormFields() {
  return (
    <>
      <Form.Item
        name="name"
        label="客户名称"
        rules={[
          { required: true, message: '请输入客户名称' },
          { max: 50, message: '客户名称最多 50 个字符' },
        ]}
      >
        <Input placeholder="例如：星海智能科技" maxLength={50} />
      </Form.Item>
      <Form.Item
        name="code"
        label="客户编码"
        tooltip="3-20 位字母、数字或短横线，保存后仍可修改"
        rules={[
          { required: true, message: '请输入客户编码' },
          { pattern: /^[A-Za-z0-9-]{3,20}$/, message: '编码需为 3-20 位字母、数字或短横线' },
        ]}
      >
        <Input placeholder="例如：CUS-025" maxLength={20} />
      </Form.Item>
      <Form.Item name="industry" label="所属行业" rules={[{ required: true, message: '请选择所属行业' }]}>
        <Select placeholder="选择行业" options={industryOptions} />
      </Form.Item>
      <Form.Item name="status" label="客户状态" rules={[{ required: true, message: '请选择客户状态' }]}>
        <Select placeholder="选择状态" options={customerStatusOptions} />
      </Form.Item>
      <Form.Item
        name="contactName"
        label="联系人"
        rules={[
          { required: true, message: '请输入联系人' },
          { max: 30, message: '联系人最多 30 个字符' },
        ]}
      >
        <Input placeholder="联系人姓名" maxLength={30} />
      </Form.Item>
      <Form.Item
        name="phone"
        label="联系电话"
        rules={[
          { required: true, message: '请输入联系电话' },
          {
            pattern: /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/,
            message: '请输入有效的手机号码或座机号',
          },
        ]}
      >
        <Input placeholder="手机号或座机号" maxLength={20} />
      </Form.Item>
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input placeholder="name@example.com" maxLength={100} />
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
