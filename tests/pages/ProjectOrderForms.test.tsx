import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ProjectFormPage from '../../src/pages/projects/ProjectFormPage';
import OrderFormPage from '../../src/pages/orders/OrderFormPage';
import { ordersApi } from '../../src/features/orders/api';
import { projectsApi } from '../../src/features/projects/api';
import dayjs from 'dayjs';
import ProjectListPage from '../../src/pages/projects/ProjectListPage';
import OrderListPage from '../../src/pages/orders/OrderListPage';
import ProjectDetailPage from '../../src/pages/projects/ProjectDetailPage';
import OrderDetailPage from '../../src/pages/orders/OrderDetailPage';
import { renderWithRouter } from '../testUtils';

describe('ProjectFormPage', () => {
  it('creates a project through the independent form and persists via the API', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<ProjectFormPage />, { route: '/projects/new', path: '/projects/new' });

    await user.type(screen.getByLabelText('项目名称'), '界面新建项目');
    await user.type(screen.getByLabelText('项目编码'), 'PRJ-UI-001');

    const customerCombobox = screen.getByRole('combobox', { name: '选择客户' });
    await user.type(customerCombobox, '星海');
    await user.click(await screen.findByTitle(/星海智能科技/, {}, { timeout: 8000 }));

    await user.click(screen.getByLabelText('负责人'));
    await user.click(await screen.findByTitle('张伟'));

    const startInput = screen.getByPlaceholderText('开始日期');
    const endInput = screen.getByPlaceholderText('结束日期');
    await user.type(startInput, dayjs().add(10, 'day').format('YYYY-MM-DD'));
    await user.tab();
    await user.type(endInput, dayjs().add(100, 'day').format('YYYY-MM-DD'));
    await user.tab();

    const budget = screen.getByLabelText('预算');
    await user.clear(budget);
    await user.type(budget, '2000');

    await user.click(screen.getByRole('button', { name: '创建项目' }));
    expect(await screen.findByText('项目已创建', {}, { timeout: 10000 })).toBeInTheDocument();

    const created = await projectsApi.list({ page: 1, pageSize: 10, keyword: '界面新建项目' });
    expect(created.total).toBe(1);
    expect(created.items[0]).toMatchObject({
      customerId: 'cus_01',
      owner: '张伟',
      status: 'planning',
      budget: 2000,
    });
  });

  it('loads an existing project into the edit form', async () => {
    renderWithRouter(<ProjectFormPage />, {
      route: '/projects/prj_01/edit',
      path: '/projects/:id/edit',
    });

    expect(
      await screen.findByRole('heading', { name: /编辑项目/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('项目名称')).toHaveValue('ERP 系统升级');
    expect((screen.getByLabelText('项目编码') as HTMLInputElement).value).toMatch(/^PRJ-\d{4}-001$/);
  });

  it('validates required fields and references', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<ProjectFormPage />, { route: '/projects/new', path: '/projects/new' });

    await user.click(screen.getByRole('button', { name: '创建项目' }));
    expect(await screen.findByText('请输入项目名称')).toBeInTheDocument();
    expect(screen.getByText('请输入项目编码')).toBeInTheDocument();
    expect(screen.getByText('请选择关联客户')).toBeInTheDocument();
    expect(screen.getByText('请选择负责人')).toBeInTheDocument();
    expect(screen.getByText('请选择项目开始和结束日期')).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: '选择客户' })).toBeInTheDocument();
  });
});

describe('OrderFormPage', () => {
  it('creates an order through the independent form and persists via the API', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<OrderFormPage />, { route: '/orders/new', path: '/orders/new' });

    await user.type(screen.getByLabelText('订单号'), 'UI-ORDER-1');
    await user.type(screen.getByLabelText('订单金额'), '1234.5');

    const customerCombobox = screen.getByRole('combobox', { name: '选择客户' });
    await user.type(customerCombobox, '星海');
    await user.click(await screen.findByTitle(/星海智能科技/, {}, { timeout: 8000 }));

    const orderDate = screen.getByLabelText('下单日期') as HTMLInputElement;
    await waitFor(() => expect(orderDate.value).not.toBe(''));

    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('订单已创建', {}, { timeout: 8000 })).toBeInTheDocument();

    const created = await ordersApi.list({ page: 1, pageSize: 10, keyword: 'UI-ORDER-1' });
    expect(created.total).toBe(1);
    expect(created.items[0]).toMatchObject({
      status: 'pending',
      amount: 1234.5,
      customerId: 'cus_01',
    });
  });

  it('loads an existing order into the edit form', async () => {
    renderWithRouter(<OrderFormPage />, {
      route: '/orders/ord_02/edit',
      path: '/orders/:id/edit',
    });

    expect(
      await screen.findByRole('heading', { name: /编辑订单/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect((await screen.findByLabelText('订单号') as HTMLInputElement).value).toMatch(/^ORD-\d{4}-0002$/);
  });

  it('validates required fields and enables project selection after customer selection', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<OrderFormPage />, { route: '/orders/new', path: '/orders/new' });

    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('请输入订单号')).toBeInTheDocument();
    expect(screen.getByText('请选择客户')).toBeInTheDocument();
    expect(screen.getByText('请输入订单金额')).toBeInTheDocument();

    const projectSelect = screen.getByRole('combobox', { name: '选择关联项目' });
    expect(projectSelect).toBeDisabled();
    expect(screen.getByText('请先选择客户')).toBeInTheDocument();

    const customerCombobox = screen.getByRole('combobox', { name: '选择客户' });
    await user.type(customerCombobox, '星海');
    await user.click(await screen.findByTitle(/星海智能科技/, {}, { timeout: 8000 }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: '选择关联项目' })).not.toBeDisabled(),
    );
  });
});

describe('Project and order lists', () => {
  it('loads projects with customer and budget columns', async () => {
    renderWithRouter(<ProjectListPage />, { route: '/projects', path: '/projects' });
    expect(await screen.findByText('智能工厂改造', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/共 18 条/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '预算' })).toBeInTheDocument();
  });

  it('loads orders with formatted amounts and links', async () => {
    renderWithRouter(<OrderListPage />, { route: '/orders', path: '/orders' });
    expect(await screen.findByText(/ORD-\d{4}-0001/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/共 36 条/)).toBeInTheDocument();
    expect(screen.getAllByText(/¥/).length).toBeGreaterThan(0);
  });
});

describe('Project and order details', () => {
  it('shows project details with a linked customer and progress', async () => {
    renderWithRouter(<ProjectDetailPage />, {
      route: '/projects/prj_01',
      path: '/projects/:id',
    });

    expect(
      await screen.findByRole('heading', { name: 'ERP 系统升级' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '星海智能科技' })).toHaveAttribute(
      'href',
      '/customers/cus_01',
    );
    expect(screen.getByText('项目进度')).toBeInTheDocument();
    expect(screen.getByText('当前完成度 45%')).toBeInTheDocument();
    expect(screen.getByText(/¥80,000.00/)).toBeInTheDocument();
  });

  it('shows order details with linked customer and project', async () => {
    renderWithRouter(<OrderDetailPage />, {
      route: '/orders/ord_02',
      path: '/orders/:id',
    });

    expect(
      await screen.findByRole('heading', { name: /ORD-\d{4}-0002/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '云杉数据' })).toHaveAttribute(
      'href',
      '/customers/cus_02',
    );
    expect(screen.getByRole('link', { name: '数据中台建设' })).toHaveAttribute(
      'href',
      '/projects/prj_02',
    );
    expect(screen.getByText('金额说明')).toBeInTheDocument();
  });
});
