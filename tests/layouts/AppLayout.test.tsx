import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from '../../src/layouts/AppLayout';
import { TestProviders } from '../testUtils';

function renderLayout(initialEntry = '/') {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<div>仪表盘内容</div>} />
            <Route path="customers" element={<div>客户页面内容</div>} />
            <Route path="projects" element={<div>项目页面内容</div>} />
            <Route path="orders" element={<div>订单页面内容</div>} />
            <Route path="users" element={<div>用户页面内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('AppLayout', () => {
  it('keeps the brand, search and theme entries and has no page tab bar', async () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /React Topnav Template 首页/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开全局搜索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换深色主题' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(await screen.findByText('仪表盘内容')).toBeInTheDocument();
  });

  it('opens the command palette with Ctrl+K and navigates to a result', async () => {
    const user = userEvent.setup({ delay: null });
    renderLayout();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox', { name: '搜索页面或导航入口' });
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, '客户');
    await user.click(within(dialog).getByRole('option', { name: /客户管理/ }));
    expect(await screen.findByText('客户页面内容')).toBeInTheDocument();
  });

  it('also opens the palette with the macOS command shortcut', async () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the same palette from the visible search button', async () => {
    const user = userEvent.setup({ delay: null });
    renderLayout();
    await user.click(screen.getByRole('button', { name: '打开全局搜索' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the mobile drawer with brand, search and theme controls', async () => {
    const user = userEvent.setup({ delay: null });
    renderLayout();

    const menuButton = await screen.findByRole('button', { name: '打开导航菜单' });
    await user.click(menuButton);

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('React Topnav Template')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /全局搜索/ })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /切换深色主题/ })).toBeInTheDocument();
    await user.click(within(drawer).getByRole('menuitem', { name: /业务管理/ }));
    expect(await within(drawer).findByRole('menuitem', { name: /客户管理/ })).toBeInTheDocument();
  });

  it('renders desktop dropdown navigation in a wide viewport', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 992px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    try {
      renderLayout();
      expect(await screen.findByRole('menuitem', { name: /业务管理/ })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /仪表盘/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '打开导航菜单' })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
    }
  });

  it('toggles and persists the theme', async () => {
    const user = userEvent.setup({ delay: null });
    renderLayout();

    await user.click(screen.getByRole('button', { name: '切换深色主题' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(window.localStorage.getItem('app-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: '切换浅色主题' })).toBeInTheDocument();
  });
});
