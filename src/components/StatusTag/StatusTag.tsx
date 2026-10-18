import { Tag } from 'antd';
import {
  customerStatusMeta,
  getStatusMeta,
  orderStatusMeta,
  projectStatusMeta,
  userStatusMeta,
  type StatusMeta,
} from '../../config/options';
import type { CustomerStatus, OrderStatus, ProjectStatus, UserStatus } from '../../types/entities';

export type StatusKind = 'customer' | 'project' | 'order' | 'user';

const metaByKind: Record<StatusKind, Record<string, StatusMeta>> = {
  customer: customerStatusMeta,
  project: projectStatusMeta,
  order: orderStatusMeta,
  user: userStatusMeta,
};

interface StatusTagProps {
  kind: StatusKind;
  value: CustomerStatus | ProjectStatus | OrderStatus | UserStatus | string;
}

const tagColor: Record<StatusMeta['tone'], string | undefined> = {
  success: 'success',
  processing: 'processing',
  warning: 'warning',
  error: 'error',
  default: undefined,
};

export function StatusTag({ kind, value }: StatusTagProps) {
  const meta = getStatusMeta(metaByKind[kind], value);
  return (
    <Tag color={tagColor[meta.tone]} className="status-tag" data-status={value}>
      {meta.label}
    </Tag>
  );
}
