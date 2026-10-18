import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UserListPage from '../../src/pages/users/UserListPage';
import UserDetailPage from '../../src/pages/users/UserDetailPage';
import UserFormPage from '../../src/pages/users/UserFormPage';
import { usersApi } from '../../src/features/users/api';
import { renderWithRouter } from '../testUtils';

describe('UserListPage', () => {
  it('clamps an out-of-range URL page to the last available page', async () => {
    renderWithRouter(<UserListPage />, { route: '/users?page=99', path: '/users' });

    expect(await screen.findByText('张伟', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/共 14 条/)).toBeInTheDocument();
  });

  it('filters by department and disables users after confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<UserListPage />, { route: '/users', path: '/users' });

    expect(await screen.findByText('林峰', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText(/共 14 条/)).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '按部门筛选' }));
    await user.click(await screen.findByTitle('产品研发'));
    expect(await screen.findByText(/共 4 条/)).toBeInTheDocument();

    const row = screen.getByText('张伟').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: '停用' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/停用用户「张伟」/).length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: '停用' }));

    expect(await screen.findByText('用户已停用', {}, { timeout: 8000 })).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText('张伟').closest('tr')?.textContent).toContain('停用'),
      { timeout: 8000 },
    );
  });
});

describe('UserDetailPage', () => {
  it('shows business profile data and clearly states there is no real authentication', async () => {
    renderWithRouter(<UserDetailPage />, { route: '/users/usr_07', path: '/users/:id' });

    expect(await screen.findByRole('heading', { name: '孙浩' }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText('演示说明')).toBeInTheDocument();
    expect(screen.getByText(/不包含真实登录、密码管理、认证或权限控制/)).toBeInTheDocument();
    expect(screen.getByText('从未登录')).toBeInTheDocument();
    expect(screen.getByText(/@sunhao/)).toBeInTheDocument();
  });
});

describe('UserFormPage', () => {
  it('creates a user through the independent form and persists via the API', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<UserFormPage />, { route: '/users/new', path: '/users/new' });

    await user.type(screen.getByLabelText('姓名'), '界面新建用户');
    await user.type(screen.getByLabelText('用户名'), 'ui_new_user');
    await user.type(screen.getByLabelText('邮箱'), 'ui-new-user@example.com');
    await user.click(screen.getByLabelText('部门'));
    await user.click(await screen.findByTitle('运营'));
    await user.click(screen.getByLabelText('角色/岗位'));
    await user.click(await screen.findByTitle('运营专员'));

    await user.click(screen.getByRole('button', { name: '创建用户' }));
    expect(await screen.findByText('用户已创建', {}, { timeout: 8000 })).toBeInTheDocument();

    const created = await usersApi.list({ page: 1, pageSize: 10, keyword: 'ui_new_user' });
    expect(created.total).toBe(1);
    expect(created.items[0]).toMatchObject({
      name: '界面新建用户',
      department: '运营',
      role: '运营专员',
    });
  });

  it('loads an existing user into the edit form', async () => {
    renderWithRouter(<UserFormPage />, {
      route: '/users/usr_01/edit',
      path: '/users/:id/edit',
    });

    expect(
      await screen.findByRole('heading', { name: /编辑用户/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('姓名')).toHaveValue('张伟');
    expect(screen.getByLabelText('用户名')).toHaveValue('zhangwei');
  });

  it('validates username, email and required fields', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<UserFormPage />, { route: '/users/new', path: '/users/new' });

    await user.click(screen.getByRole('button', { name: '创建用户' }));
    expect(await screen.findByText('请输入姓名')).toBeInTheDocument();
    expect(screen.getByText('请输入用户名')).toBeInTheDocument();
    expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByText('请选择部门')).toBeInTheDocument();
    expect(screen.getByText('请选择角色/岗位')).toBeInTheDocument();

    await user.type(screen.getByLabelText('用户名'), '1');
    expect(await screen.findByText(/用户名需以字母开头/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('邮箱'), 'invalid');
    expect(await screen.findByText('请输入有效的邮箱地址')).toBeInTheDocument();
  });
});
