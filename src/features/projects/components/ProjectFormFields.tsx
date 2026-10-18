import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { projectOwnerOptions, projectStatusOptions } from '../../../config/options';
import type { Project, ProjectInput } from '../../../types/entities';
import { CustomerSelect } from '../../customers/components/CustomerSelect';

export interface ProjectFormValues extends Omit<ProjectInput, 'startDate' | 'endDate'> {
  dateRange: [Dayjs, Dayjs];
}

export const projectFormDefaults: Partial<ProjectFormValues> = {
  status: 'planning',
  progress: 0,
  budget: 0,
  notes: '',
};

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    code: project.code,
    customerId: project.customerId,
    owner: project.owner,
    status: project.status,
    progress: project.progress,
    budget: project.budget,
    notes: project.notes,
    dateRange: [dayjs(project.startDate), dayjs(project.endDate)],
  };
}

export function projectValuesToInput(values: ProjectFormValues): ProjectInput {
  return {
    name: values.name,
    code: values.code,
    customerId: values.customerId,
    owner: values.owner,
    status: values.status,
    progress: values.progress,
    startDate: values.dateRange[0].format('YYYY-MM-DD'),
    endDate: values.dateRange[1].format('YYYY-MM-DD'),
    budget: values.budget,
    notes: values.notes ?? '',
  };
}

export function ProjectFormFields() {
  return (
    <>
      <Form.Item
        name="name"
        label="项目名称"
        rules={[
          { required: true, message: '请输入项目名称' },
          { max: 60, message: '项目名称最多 60 个字符' },
        ]}
      >
        <Input placeholder="例如：数据中台建设" maxLength={60} />
      </Form.Item>
      <Form.Item
        name="code"
        label="项目编码"
        rules={[
          { required: true, message: '请输入项目编码' },
          { pattern: /^[A-Za-z0-9-]{3,24}$/, message: '编码需为 3-24 位字母、数字或短横线' },
        ]}
      >
        <Input placeholder="例如：PRJ-2026-019" maxLength={24} />
      </Form.Item>
      <Form.Item
        name="customerId"
        label="关联客户"
        rules={[{ required: true, message: '请选择关联客户' }]}
      >
        <CustomerSelect placeholder="搜索并选择客户" />
      </Form.Item>
      <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请选择负责人' }]}>
        <Select placeholder="选择负责人" options={projectOwnerOptions} />
      </Form.Item>
      <Form.Item name="status" label="项目状态" rules={[{ required: true, message: '请选择项目状态' }]}>
        <Select placeholder="选择状态" options={projectStatusOptions} />
      </Form.Item>
      <Form.Item
        name="progress"
        label="进度（%）"
        rules={[{ required: true, message: '请输入项目进度' }]}
      >
        <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name="dateRange"
        label="项目周期"
        className="form-span-full"
        rules={[{ required: true, message: '请选择项目开始和结束日期' }]}
      >
        <DatePicker.RangePicker
          format="YYYY-MM-DD"
          style={{ width: '100%' }}
          placeholder={['开始日期', '结束日期']}
        />
      </Form.Item>
      <Form.Item
        name="budget"
        label="预算"
        rules={[{ required: true, message: '请输入项目预算' }]}
      >
        <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
      </Form.Item>
      <div aria-hidden="true" />
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
