import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import { Column, Pie, type ColumnConfig, type PieConfig } from '@ant-design/charts';
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  RefreshCw,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardRangeOptions, projectStatusMeta } from '../config/options';
import { appConfig } from '../config/app.config';
import { useDashboardSummary } from '../features/dashboard/queries';
import { useAppPreferences } from '../app/AppProviders';
import type { DashboardRange, Order } from '../types/entities';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';
import { getErrorMessage } from '../lib/api/errors';
import { copy } from '../config/copy';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '../components/AsyncState/AsyncState';
import { DashboardCard } from '../components/templates/DashboardCard';
import { StatusTag } from '../components/StatusTag/StatusTag';
import styles from './DashboardPage.module.css';
import { routeDefinitions } from '../config/routes';

interface KpiDefinition {
  key: string;
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

const pageMeta = routeDefinitions.find((route) => route.path === '/')!;

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('30d');
  const { themeMode } = useAppPreferences();
  const summaryQuery = useDashboardSummary(range);
  const summary = summaryQuery.data;
  const isDark = themeMode === 'dark';
  const textColor = isDark ? '#d7d9e3' : '#4b4f5c';
  const gridColor = isDark ? '#2a2e3d' : '#eceef5';

  const kpis: KpiDefinition[] = summary
    ? [
        {
          key: 'customers',
          label: copy.dashboard.customerCount,
          value: summary.metrics.customerCount,
          hint: copy.dashboard.viewAllCustomers,
          href: '/customers',
          icon: Users,
          color: '#635bdb',
        },
        {
          key: 'projects',
          label: copy.dashboard.activeProjects,
          value: summary.metrics.activeProjectCount,
          hint: copy.dashboard.viewActiveProjects,
          href: '/projects?status=in_progress',
          icon: BriefcaseBusiness,
          color: '#2f9e8f',
        },
        {
          key: 'orders',
          label: copy.dashboard.pendingOrders,
          value: summary.metrics.pendingOrderCount,
          hint: copy.dashboard.viewPendingOrders,
          href: '/orders?status=pending',
          icon: ClipboardList,
          color: '#d98a1f',
        },
        {
          key: 'users',
          label: copy.dashboard.userCount,
          value: summary.metrics.userCount,
          hint: copy.dashboard.viewUsers,
          href: '/users',
          icon: UserRoundCog,
          color: '#3f7cc7',
        },
      ]
    : [];

  const pieData = (summary?.projectStatus ?? []).map((bucket) => ({
    label: projectStatusMeta[bucket.status]?.label ?? bucket.status,
    count: bucket.count,
  }));
  const trendData = summary?.orderTrend ?? [];
  const hasProjectData = pieData.some((item) => item.count > 0);
  const hasTrendData = trendData.some((item) => item.orderCount > 0 || item.amount > 0);

  const pieConfig: PieConfig = {
    data: pieData,
    angleField: 'count',
    colorField: 'label',
    innerRadius: 0.62,
    height: 290,
    autoFit: true,
    legend: {
      color: { position: 'bottom', itemLabelFill: textColor },
    },
    label: {
      text: (datum: { count: number }) => String(datum.count),
      style: { fill: isDark ? '#0f1117' : '#ffffff', fontWeight: 600 },
    },
    scale: {
      color: {
        range: ['#635bdb', '#8b7cf6', '#2f9e8f', '#d98a1f', '#d95c5c'],
      },
    },
    tooltip: {
      title: 'label',
      items: [{ field: 'count', name: copy.dashboard.projectCount }],
    },
    theme: isDark ? 'classicDark' : 'classic',
  };

  const columnConfig: ColumnConfig = {
    data: trendData,
    xField: 'label',
    yField: 'orderCount',
    height: 290,
    autoFit: true,
    axis: {
      x: { labelFill: textColor, labelAutoRotate: false, labelAutoHide: true },
      y: { labelFill: textColor, gridStroke: gridColor },
    },
    style: { fill: appConfig.brandColor, radiusTopLeft: 4, radiusTopRight: 4 },
    tooltip: {
      title: 'label',
      items: [
        { field: 'orderCount', name: copy.dashboard.orderCount },
        {
          field: 'amount',
          name: copy.dashboard.orderAmount,
          valueFormatter: (value: number) => formatCurrency(value),
        },
      ],
    },
    theme: isDark ? 'classicDark' : 'classic',
  };

  const recentColumns = [
    {
      title: copy.dashboard.columns.orderNo,
      dataIndex: 'orderNo',
      render: (value: string, record: Order) => <Link to={`/orders/${record.id}`}>{value}</Link>,
    },
    {
      title: copy.dashboard.columns.customer,
      key: 'customer',
      render: (_: unknown, record: Order) =>
        record.customer ? (
          <Link to={`/customers/${record.customer.id}`}>{record.customer.name}</Link>
        ) : (
          <Tag color="warning">{copy.dashboard.customerMissing}</Tag>
        ),
    },
    {
      title: copy.dashboard.columns.status,
      dataIndex: 'status',
      width: 110,
      render: (_: unknown, record: Order) => <StatusTag kind="order" value={record.status} />,
    },
    {
      title: copy.dashboard.columns.amount,
      dataIndex: 'amount',
      width: 150,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: copy.dashboard.columns.orderDate,
      dataIndex: 'orderDate',
      width: 120,
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={pageMeta.title}
        description={
          summary
            ? copy.dashboard.rangeDescription(summary.rangeLabel, summary.from, summary.to)
            : pageMeta.description
        }
        meta={
          summary && (
            <Space wrap size={[8, 8]}>
              <Tag color="purple">{copy.dashboard.rangeOrders(summary.metrics.rangeOrderCount)}</Tag>
              <Tag color="gold">{copy.dashboard.rangeAmount(formatCurrency(summary.metrics.rangeOrderAmount))}</Tag>
            </Space>
          )
        }
        extra={
          <Space wrap>
            {summaryQuery.isFetching && !summaryQuery.isPending && (
              <Typography.Text type="secondary">{copy.dashboard.updating}</Typography.Text>
            )}
            <Segmented
              aria-label={copy.dashboard.rangeSelector}
              value={range}
              onChange={(value) => setRange(value as DashboardRange)}
              options={dashboardRangeOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
            <Button
              icon={<RefreshCw size={15} />}
              onClick={() => void summaryQuery.refetch()}
              loading={summaryQuery.isFetching}
            >
              {copy.dashboard.refresh}
            </Button>
          </Space>
        }
      />

      {summaryQuery.error && summary && (
        <Alert
          type="error"
          showIcon
          title={copy.dashboard.refreshFailed}
          description={getErrorMessage(summaryQuery.error)}
          action={
            <Button size="small" onClick={() => void summaryQuery.refetch()}>
              {copy.common.retry}
            </Button>
          }
        />
      )}

      {summaryQuery.error && !summary ? (
        <ErrorState error={summaryQuery.error} title={copy.dashboard.loadFailed} onRetry={() => void summaryQuery.refetch()} />
      ) : summaryQuery.isPending ? (
        <LoadingState label={copy.dashboard.loadingLabel} rows={8} />
      ) : summary ? (
        <>
          <Row gutter={[16, 16]}>
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Col xs={24} sm={12} xl={6} key={kpi.key}>
                  <Link to={kpi.href} className={styles.kpiLink} aria-label={`${kpi.label}：${kpi.value}，${kpi.hint}`}>
                    <Card hoverable className={styles.kpiCard}>
                      <div className={styles.kpiTop}>
                        <span className={styles.kpiIcon} style={{ color: kpi.color, background: `${kpi.color}18` }}>
                          <Icon size={19} aria-hidden="true" />
                        </span>
                        <Typography.Text type="secondary">{kpi.label}</Typography.Text>
                      </div>
                      <div className={styles.kpiValue}>{formatNumber(kpi.value)}</div>
                      <div className={styles.kpiHint}>
                        <span>{kpi.hint}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </div>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <DashboardCard
                title={copy.dashboard.projectStatus}
                extra={<Typography.Text type="secondary">{copy.dashboard.allProjects}</Typography.Text>}
                loading={summaryQuery.isFetching && !summary}
              >
                {hasProjectData ? (
                  <div role="img" aria-label={copy.dashboard.projectChartLabel(summary.rangeLabel)}>
                    <Pie {...pieConfig} />
                  </div>
                ) : (
                  <EmptyState title={copy.dashboard.noProjectData} description={copy.dashboard.noProjectDescription} />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} xl={14}>
              <DashboardCard
                title={copy.dashboard.orderTrend}
                extra={
                  <Typography.Text type="secondary">
                    {summary.rangeLabel} · {copy.dashboard.noCancelled}
                  </Typography.Text>
                }
                loading={summaryQuery.isFetching && !summary}
              >
                {hasTrendData ? (
                  <div role="img" aria-label={copy.dashboard.trendChartLabel(summary.rangeLabel)}>
                    <Column {...columnConfig} />
                  </div>
                ) : (
                  <EmptyState title={copy.dashboard.noTrendData} description={copy.dashboard.noTrendDescription} />
                )}
              </DashboardCard>
            </Col>
          </Row>

          <Card
            className={styles.recentCard}
            title={copy.dashboard.recentOrders}
            extra={<Link to="/orders">{copy.dashboard.viewAllOrders}</Link>}
          >
            {summary.recentOrders.length === 0 ? (
              <EmptyState title={copy.dashboard.noOrders} description={copy.dashboard.noOrdersDescription} action={<Link to="/orders/new">{copy.dashboard.newOrder}</Link>} />
            ) : (
              <Table<Order>
                rowKey="id"
                size="middle"
                columns={recentColumns}
                dataSource={summary.recentOrders}
                pagination={false}
                scroll={{ x: 680 }}
              />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
