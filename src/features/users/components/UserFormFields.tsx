import { Form, Input, Select } from 'antd';
import { departmentOptions, roleOptions, userStatusOptions } from '../../../config/options';
import type { User, UserInput } from '../../../types/entities';

export const userFormDefaults: Partial<UserInput> = {
  status: 'active',
};

export function userToFormValues(user: User): UserInput {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    department: user.department,
    role: user.role,
    status: user.status,
  };
}

export function UserFormFields() {
  return (
    <>
      <Form.Item
        name="name"
        label="姓名"
        rules={[
          { required: true, message: '请输入姓名' },
          { max: 30, message: '姓名最多 30 个字符' },
        ]}
      >
        <Input placeholder="用户姓名" maxLength={30} />
      </Form.Item>
      <Form.Item
        name="username"
        label="用户名"
        tooltip="以字母开头，3-20 位字母、数字或下划线"
        rules={[
          { required: true, message: '请输入用户名' },
          {
            pattern: /^[A-Za-z][A-Za-z0-9_]{2,19}$/,
            message: '用户名需以字母开头，3-20 位字母、数字或下划线',
          },
        ]}
      >
        <Input placeholder="例如：zhangwei" maxLength={20} autoComplete="off" />
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
      <Form.Item name="department" label="部门" rules={[{ required: true, message: '请选择部门' }]}>
        <Select placeholder="选择部门" options={departmentOptions} />
      </Form.Item>
      <Form.Item name="role" label="角色/岗位" rules={[{ required: true, message: '请选择角色/岗位' }]}>
        <Select placeholder="选择角色/岗位" options={roleOptions} />
      </Form.Item>
      <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
        <Select placeholder="选择状态" options={userStatusOptions} />
      </Form.Item>
    </>
  );
}
