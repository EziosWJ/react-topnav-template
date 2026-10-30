import {
  customerStatusMeta,
  getStatusMeta,
  orderStatusMeta,
  projectStatusMeta,
  userStatusMeta,
  type StatusMeta,
} from '../../config/options';
import type { CustomerStatus, OrderStatus, ProjectStatus, UserStatus } from '../../types/entities';
import { statusToneTokens } from '../../styles/tokens';
import styles from './StatusTag.module.css';

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

export function StatusTag({ kind, value }: StatusTagProps) {
  const meta = getStatusMeta(metaByKind[kind], value);
  const tone = statusToneTokens[meta.tone];

  return (
    <span
      className={`${styles.statusTag} status-tag`}
      data-status={value}
      data-tone={meta.tone}
      style={
        {
          '--status-color': tone.light.fg,
          '--status-bg': tone.light.bg,
          '--status-color-dark': tone.dark.fg,
          '--status-bg-dark': tone.dark.bg,
        } as React.CSSProperties
      }
    >
      <span className={styles.dot} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
