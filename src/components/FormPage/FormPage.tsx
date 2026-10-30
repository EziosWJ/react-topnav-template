import type { ReactNode } from 'react';
import { Alert, Button, Card, Divider, Form, Space, type FormInstance } from 'antd';
import { getErrorMessage } from '../../lib/api/errors';
import { copy } from '../../config/copy';
import { PageHeader, type PageHeaderProps } from '../PageHeader/PageHeader';
import styles from './FormPage.module.css';

export interface FormPageProps<T> {
  form: FormInstance<T>;
  onFinish: (values: T) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  error?: unknown;
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  extraActions?: ReactNode;
  /** The page header is rendered here so every create/edit page shares one structure. */
  header?: PageHeaderProps;
  /** Optional warning shown between the header and the form. */
  notice?: ReactNode;
}

export function FormPage<T>({
  form,
  onFinish,
  onCancel,
  submitting,
  error,
  children,
  submitText = copy.form.save,
  cancelText = copy.form.cancel,
  extraActions,
  header,
  notice,
}: FormPageProps<T>) {
  return (
    <div className={styles.page}>
      {header && <PageHeader {...header} />}
      {notice}
      <Card className={styles.card}>
        {error !== undefined && error !== null && (
          <Alert
            type="error"
            showIcon
            title={copy.common.saveFailed}
            description={getErrorMessage(error)}
            className={styles.alert}
          />
        )}
        <Form<T> form={form} layout="vertical" onFinish={onFinish} scrollToFirstError requiredMark>
          <div className={styles.grid}>{children}</div>
          <Divider className={styles.divider} />
          <Space wrap className={styles.footer}>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {submitText}
            </Button>
            <Button onClick={onCancel} disabled={submitting}>
              {cancelText}
            </Button>
            {extraActions}
          </Space>
        </Form>
      </Card>
    </div>
  );
}
