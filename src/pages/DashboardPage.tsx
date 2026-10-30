import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import {
  Column,
  Line,
  Pie,
  type ColumnConfig,
  type LineConfig,
  type PieConfig,
} from '@ant-design/charts';
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
import { chartPalettes, kpiAccents } from '../styles/tokens';
import styles from './DashboardPage.module.css';
import { routeDefinitions } from '../config/routes';

interface KpiDefinition {
  key: 'customers' | 'projects' | 'orders' | 'users';
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: LucideIcon;
}

const pageMeta = routeDefinitions.find((route) => route.path === '/')!;

function compactAmount(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 10_000)}万`;
  return formatNumber(value);
}

export default function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>('30d');
  const { themeMode } = useAppPreferences();
  const summaryQuery = useDashboardSummary(range);
  const summary = summaryQuery.data;
  const isDark = themeMode === 'dark';
  const palette = chartPalettes[themeMode];

  const kpis: KpiDefinition[] = summary
    ? [
        {
          key: 'customers',
          label: copy.dashboard.customerCount,
          value: summary.metrics.customerCount,
          hint: copy.dashboard.viewAllCustomers,
          href: '/customers',
          icon: Users,
        },
        {
          key: 'projects',
          label: copy.dashboard.activeProjects,
          value: summary.metrics.activeProjectCount,
          hint: copy.dashboard.viewActiveProjects,
          href: '/projects?status=in_progress',
          icon: BriefcaseBusiness,
        },
        {
          key: 'orders',
          label: copy.dashboard.pendingOrders,
          value: summary.metrics.pendingOrderCount,
          hint: copy.dashboard.viewPendingOrders,
          href: '/orders?status=pending',
          icon: ClipboardList,
        },
        {
          key: 'users',
          label: copy.dashboard.userCount,
          value: summary.metrics.userCount,
          hint: copy.dashboard.viewUsers,
          href: '/users',
          icon: UserRoundCog,
        },
      ]
    : [];

  const pieData = (summary?.projectStatus ?? []).map((bucket) => ({
    label: projectStatusMeta[bucket.status]?.label ?? bucket.status,
    count: bucket.count,
  }));
  const trendData = summary?.orderTrend ?? [];
  const hasProjectData = pieData.some((item) => item.count > 0);
  const hasCountData = trendData.some((item) => item.orderCount > 0);
  const hasAmountData = trendData.some((item) => item.amount > 0);

  const chartTheme = isDark ? 'classicDark' : 'classic';

  const pieConfig: PieConfig = {
    data: pieData,
    angleField: 'count',
    colorField: 'label',
    innerRadius: 0.62,
    height: 260,
    autoFit: true,
    legend: {
      color: { position: 'bottom', itemLabelFill: palette.axis },
    },
    label: {
      text: (datum: { count: number }) => String(datum.count),
      style: { fill: isDark ? '#0f1117' : '#ffffff', fontWeight: 600 },
    },
    scale: { color: { range: palette.categories } },
    tooltip: {
      title: 'label',
      items: [{ field: 'count', name: copy.dashboard.projectCount }],
    },
    theme: chartTheme,
  };

  const countConfig: ColumnConfig = {
    data: trendData,
    xField: 'label',
    yField: 'orderCount',
    height: 260,
    autoFit: true,
    axis: {
      x: {
        labelFill: palette.axis,
        labelFontSize: 11,
        labelAutoRotate: false,
        labelAutoHide: true,
      },
      y: {
        labelFill: palette.axis,
        gridStroke: palette.grid,
        gridStrokeOpacity: 0.8,
        labelFormatter: (value: number) => formatNumber(value),
      },
    },
    style: { fill: palette.count, radiusTopLeft: 4, radiusTopRight: 4 },
    tooltip: {
      title: 'label',
      items: [{ field: 'orderCount', name: copy.dashboard.orderCount }],
    },
    theme: chartTheme,
  };

  const amountConfig: LineConfig = {
    data: trendData,
    xField: 'label',
    yField: 'amount',
    height: 260,
    autoFit: true,
    axis: {
      x: {
        labelFill: palette.axis,
        labelFontSize: 11,
        labelAutoRotate: false,
        labelAutoHide: true,
      },
      y: {
        labelFill: palette.axis,
        gridStroke: palette.grid,
        gridStrokeOpacity: 0.8,
        labelFormatter: (value: number) => compactAmount(value),
      },
    },
    style: { stroke: palette.amount, lineWidth: 2 },
    point: {
      size: 3,
      shape: 'circle',
      style: { fill: palette.amount, stroke: palette.amount },
    },
    tooltip: {
      title: 'label',
      items: [
        {
          field: 'amount',
          name: copy.dashboard.orderAmount,
          valueFormatter: (value: number) => formatCurrency(value),
        },
      ],
    },
    theme: chartTheme,
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
      render: (value: number) => <span className="table-amount">{formatCurrency(value)}</span>,
    },
    {
      title: copy.dashboard.columns.orderDate,
      dataIndex: 'orderDate',
      width: 120,
      render: (value: string) => formatDate(value),
    },
  ];

  const trendExtra = (
    <Typography.Text type="secondary" className={styles.chartExtra}>
      {summary?.rangeLabel} · {copy.dashboard.noCancelled}
    </Typography.Text>
  );

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
        <LoadingState label={copy.dashboard.loadingLabel} variant="cards" />
      ) : summary ? (
        <>
          <Row gutter={[16, 16]}>
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const accent = kpiAccents[kpi.key][themeMode];
              return (
                <Col xs={24} sm={12} xl={6} key={kpi.key}>
                  <Link
                    to={kpi.href}
                    className={styles.kpiLink}
                    aria-label={`${kpi.label}：${kpi.value}，${kpi.hint}`}
                  >
                    <Card hoverable className={styles.kpiCard}>
                      <div className={styles.kpiTop}>
                        <span
                          className={styles.kpiIcon}
                          style={{
                            color: accent,
                            background: `${accent}1f`,
                          }}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <Typography.Text type="secondary" className={styles.kpiLabel}>
                          {kpi.label}
                        </Typography.Text>
                      </div>
                      <div className={styles.kpiValue}>{formatNumber(kpi.value)}</div>
                      <span className={styles.kpiHint}>
                        <span>{kpi.hint}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={8}>
              <DashboardCard
                title={copy.dashboard.projectStatus}
                extra={<Typography.Text type="secondary">{copy.dashboard.allProjects}</Typography.Text>}
                loading={summaryQuery.isFetching && !summary}
                height={300}
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
            <Col xs={24} xl={8}>
              <DashboardCard
                title={copy.dashboard.orderCountTrend}
                extra={trendExtra}
                loading={summaryQuery.isFetching && !summary}
                height={300}
              >
                {hasCountData ? (
                  <div role="img" aria-label={copy.dashboard.orderCountChartLabel(summary.rangeLabel)}>
                    <Column {...countConfig} />
                  </div>
                ) : (
                  <EmptyState title={copy.dashboard.noTrendData} description={copy.dashboard.noTrendDescription} />
                )}
              </DashboardCard>
            </Col>
            <Col xs={24} xl={8}>
              <DashboardCard
                title={copy.dashboard.orderAmountTrend}
                extra={trendExtra}
                loading={summaryQuery.isFetching && !summary}
                height={300}
              >
                {hasAmountData ? (
                  <div role="img" aria-label={copy.dashboard.orderAmountChartLabel(summary.rangeLabel)}>
                    <Line {...amountConfig} />
                  </div>
                ) : (
                  <EmptyState title={copy.dashboard.noTrendData} description={copy.dashboard.noTrendDescription} />
                )}
              </DashboardCard>
            </Col>
          </Row>

          <Typography.Paragraph type="secondary" className={styles.trendNote}>
            {copy.dashboard.trendDescription}
          </Typography.Paragraph>

          <Card
            className={styles.recentCard}
            title={copy.dashboard.recentOrders}
            extra={<Link to="/orders">{copy.dashboard.viewAllOrders}</Link>}
          >
            {summary.recentOrders.length === 0 ? (
              <EmptyState
                title={copy.dashboard.noOrders}
                description={copy.dashboard.noOrdersDescription}
                action={<Link to="/orders/new">{copy.dashboard.newOrder}</Link>}
              />
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
