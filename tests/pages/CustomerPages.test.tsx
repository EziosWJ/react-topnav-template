import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CustomerListPage from '../../src/pages/customers/CustomerListPage';
import CustomerDetailPage from '../../src/pages/customers/CustomerDetailPage';
import CustomerFormPage from '../../src/pages/customers/CustomerFormPage';
import { renderWithRouter } from '../testUtils';

async function openCustomerList() {
  const view = renderWithRouter(<CustomerListPage />, { route: '/customers', path: '/customers' });
  expect(await screen.findByText('中科仪器', {}, { timeout: 8000 })).toBeInTheDocument();
  return view;
}

describe('CustomerListPage', () => {
  it('loads data, submits keyword searches and applies status filters', async () => {
    const user = userEvent.setup({ delay: null });
    await openCustomerList();

    expect(screen.getByText('共 24 条结果')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('搜索名称、编码、联系人或邮箱');
    await user.type(search, '星海');
    await user.click(screen.getByRole('button', { name: '搜索' }));
    expect(await screen.findByText(/共 1 条结果/)).toBeInTheDocument();
    expect(screen.getByText(/关键词「星海」/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(await screen.findByText('共 24 条结果')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '按客户状态筛选' }));
    await user.click(await screen.findByTitle('潜在客户'));
    expect(await screen.findByText(/共 5 条结果/)).toBeInTheDocument();
  });

  it('exports all rows matching the current filters as a CSV file', async () => {
    const user = userEvent.setup({ delay: null });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.mocked(URL.createObjectURL);
    createObjectURL.mockClear();

    await openCustomerList();
    await user.click(screen.getByRole('button', { name: /导出/ }));
    await user.click(await screen.findByRole('menuitem', { name: '导出 CSV（当前筛选结果）' }));

    expect(await screen.findByText(/已导出 24 条记录/, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    expect(anchorClick).toHaveBeenCalled();
    anchorClick.mockRestore();
  });

  it('creates a customer through the drawer and deletes it after confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    await openCustomerList();

    await user.click(screen.getByRole('button', { name: '新建客户' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('新建客户')).toBeInTheDocument();

    await user.type(within(drawer).getByLabelText('客户名称'), '自动化客户');
    await user.type(within(drawer).getByLabelText('客户编码'), 'CUS-888');
    await user.click(within(drawer).getByLabelText('所属行业'));
    await user.click(await screen.findByTitle('信息技术'));
    await user.type(within(drawer).getByLabelText('联系人'), '测试联系人');
    await user.type(within(drawer).getByLabelText('联系电话'), '13900008888');
    await user.type(within(drawer).getByLabelText('邮箱'), 'auto-customer@example.com');

    await user.click(within(drawer).getByRole('button', { name: '创建客户' }));
    expect(await screen.findByText('客户已创建', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(await screen.findByText('自动化客户', {}, { timeout: 8000 })).toBeInTheDocument();

    const row = screen.getByText('自动化客户').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: '删除' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/删除客户「自动化客户」/).length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    expect(await screen.findByText('客户已删除', {}, { timeout: 8000 })).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText('自动化客户')).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
  });
});

describe('CustomerDetailPage', () => {
  it('shows customer fields, related projects and related orders', async () => {
    renderWithRouter(<CustomerDetailPage />, {
      route: '/customers/cus_01',
      path: '/customers/:id',
    });

    expect(
      await screen.findByRole('heading', { name: '星海智能科技' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('CUS-001 · 信息技术')).toBeInTheDocument();
    expect(screen.getByText('关联项目')).toBeInTheDocument();
    expect(screen.getByText('关联订单')).toBeInTheDocument();
    expect(await screen.findByText('ERP 系统升级', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/ORD-\d{4}-0001/)).toBeInTheDocument();
  });

  it('explains that a referenced customer cannot be deleted', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<CustomerDetailPage />, {
      route: '/customers/cus_01',
      path: '/customers/:id',
    });
    await screen.findByRole('heading', { name: '星海智能科技' }, { timeout: 8000 });
    await screen.findByText(/关联项目/);
    await waitFor(() => expect(screen.getByText(/共 1 个/)).toBeInTheDocument(), { timeout: 8000 });

    await user.click(screen.getByRole('button', { name: '删除' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/关联 \d+ 个项目、\d+ 个订单/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
  });
});

describe('CustomerFormPage', () => {
  it('loads an existing customer into the independent edit form', async () => {
    renderWithRouter(<CustomerFormPage />, {
      route: '/customers/cus_01/edit',
      path: '/customers/:id/edit',
    });

    expect(
      await screen.findByRole('heading', { name: /编辑客户/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('客户名称')).toHaveValue('星海智能科技');
    expect(screen.getByLabelText('客户编码')).toHaveValue('CUS-001');
    expect(screen.getByLabelText('邮箱')).toHaveValue('customer01@example.com');
  });
});
