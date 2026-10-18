import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../src/mocks/server';
import type { DashboardSummary } from '../../src/types/entities';
import { renderWithRouter } from '../testUtils';

vi.mock('@ant-design/charts', () => ({
  Pie: () => <div data-testid="pie-chart" />,
  Column: () => <div data-testid="column-chart" />,
}));

const { default: DashboardPage } = await import('../../src/pages/DashboardPage');

function renderDashboard() {
  return renderWithRouter(<DashboardPage />, { route: '/', path: '/' });
}

describe('DashboardPage', () => {
  it('renders KPIs and charts from the API and links KPIs to filtered lists', async () => {
    renderDashboard();

    expect(await screen.findByText('客户总量', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByLabelText(/客户总量：24/)).toHaveAttribute('href', '/customers');
    expect(screen.getByLabelText(/进行中项目：/)).toHaveAttribute(
      'href',
      '/projects?status=in_progress',
    );
    expect(screen.getByLabelText(/待处理订单：/)).toHaveAttribute('href', '/orders?status=pending');
    expect(screen.getByLabelText(/用户总量：14/)).toHaveAttribute('href', '/users');

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('column-chart')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /项目状态分布图/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /订单数量与金额趋势图/ })).toBeInTheDocument();
    expect(screen.getByText('最近订单')).toBeInTheDocument();
    expect(screen.getByText(/ORD-\d{4}-0001/)).toBeInTheDocument();
  });

  it('refreshes the summary when the time range changes', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await screen.findByText('客户总量', {}, { timeout: 8000 });

    await user.click(screen.getByText('近 90 天'));
    expect(await screen.findByText(/近 90 天（/, {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('shows loading failure with retry', async () => {
    server.use(
      http.get('/api/dashboard/summary', () =>
        HttpResponse.json({ message: '统计服务不可用' }, { status: 500 }),
      ),
    );
    renderDashboard();

    expect(await screen.findByText('统计服务不可用', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新加载/ })).toBeInTheDocument();
  });

  it('shows empty chart states when there is no business data', async () => {
    const empty: DashboardSummary = {
      range: '30d',
      rangeLabel: '近 30 天',
      from: '2026-01-01',
      to: '2026-01-30',
      metrics: {
        customerCount: 0,
        activeProjectCount: 0,
        pendingOrderCount: 0,
        userCount: 0,
        rangeOrderCount: 0,
        rangeOrderAmount: 0,
      },
      projectStatus: [
        { status: 'planning', count: 0 },
        { status: 'in_progress', count: 0 },
        { status: 'on_hold', count: 0 },
        { status: 'completed', count: 0 },
        { status: 'canceled', count: 0 },
      ],
      orderTrend: [{ label: '01-01', orderCount: 0, amount: 0 }],
      recentOrders: [],
    };
    server.use(http.get('/api/dashboard/summary', () => HttpResponse.json(empty)));
    renderDashboard();

    expect(await screen.findByText('暂无项目数据', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText('暂无订单趋势')).toBeInTheDocument();
    expect(screen.getByText('暂无订单')).toBeInTheDocument();
  });
});
