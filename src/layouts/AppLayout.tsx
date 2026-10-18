import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Button,
  Drawer,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Tooltip,
  Typography,
  Grid,
  type MenuProps,
} from 'antd';
import { LayoutDashboard, Menu as MenuIcon, Moon, Search, Sun } from 'lucide-react';
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { appConfig } from '../config/app.config';
import { routeDefinitions } from '../config/routes';
import { useAppPreferences } from '../app/AppProviders';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const location = useLocation();
  const matches = useMatches();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const currentRoute = [...routeDefinitions]
    .filter((route) => route.path === '/' ? location.pathname === '/' : location.pathname.startsWith(route.path))
    .sort((left, right) => right.path.length - left.path.length)[0];
  const matchedHandle = [...matches].reverse().map((match) => match.handle as { title?: string } | undefined).find((handle) => handle?.title);
  const pageTitle = matchedHandle?.title ?? currentRoute?.title ?? '页面';
  const activePath = currentRoute?.path ?? '/';

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      label: '仪表盘',
      icon: <LayoutDashboard size={16} aria-hidden="true" />,
    },
    {
      key: 'business',
      label: '业务管理',
      children: routeDefinitions.filter((route) => route.group === '业务管理').map((route) => ({
        key: route.path,
        label: route.label,
        icon: <route.icon size={16} aria-hidden="true" />,
      })),
    },
    {
      key: 'system',
      label: '系统管理',
      children: routeDefinitions.filter((route) => route.group === '系统管理').map((route) => ({
        key: route.path,
        label: route.label,
        icon: <route.icon size={16} aria-hidden="true" />,
      })),
    },
  ];

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    return routeDefinitions.filter((route) =>
      !keyword || (route.label + ' ' + route.title + ' ' + route.description).toLocaleLowerCase().includes(keyword),
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    const onGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) setActiveIndex(0);
  }, [searchOpen, query]);

  const navigateTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setQuery('');
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (routeDefinitions.some((route) => route.path === key)) navigateTo(key);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, Math.max(searchResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter' && searchResults[activeIndex]) {
      event.preventDefault();
      navigateTo(searchResults[activeIndex].path);
    }
  };

  const menu = (
    <Menu
      mode={isMobile ? 'inline' : 'horizontal'}
      selectedKeys={[activePath]}
      defaultOpenKeys={currentRoute?.group === '系统管理' ? ['system'] : ['business']}
      items={menuItems}
      onClick={handleMenuClick}
      className={isMobile ? styles.mobileMenu : styles.desktopMenu}
      aria-label="主导航"
    />
  );

  return (
    <Layout className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {isMobile && (
            <Button
              type="text"
              aria-label="打开导航菜单"
              icon={<MenuIcon size={20} />}
              onClick={() => setMobileMenuOpen(true)}
            />
          )}
          <span className={styles.brandMark}>{appConfig.logoText}</span>
          <Typography.Text strong className={styles.brandName}>{appConfig.name}</Typography.Text>
        </div>
        <nav className={styles.desktopNav} aria-label="主导航">{!isMobile && menu}</nav>
        <Space className={styles.tools} size="small">
          <Tooltip title="全局搜索（Ctrl+K / ⌘K）">
            <Button
              type="default"
              icon={<Search size={16} />}
              onClick={() => setSearchOpen(true)}
              aria-label="打开全局搜索"
            >
              <span className={styles.searchLabel}>搜索</span>
              <kbd className={styles.shortcut}>Ctrl K</kbd>
            </Button>
          </Tooltip>
          <Tooltip title={themeMode === 'dark' ? '切换浅色主题' : '切换深色主题'}>
            <Button
              type="text"
              aria-label={themeMode === 'dark' ? '切换浅色主题' : '切换深色主题'}
              icon={themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              onClick={toggleTheme}
            />
          </Tooltip>
        </Space>
      </header>

      <main className={styles.content}>
        <div className={styles.pageHeading}>
          <Typography.Title level={3}>{pageTitle}</Typography.Title>
          <Typography.Text type="secondary">{currentRoute?.description}</Typography.Text>
        </div>
        <Outlet />
      </main>
      <footer className={styles.footer}>{appConfig.footerText}</footer>

      <Drawer
        title={appConfig.name}
        placement="left"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={288}
        styles={{ body: { padding: 8 } }}
      >
        {menu}
      </Drawer>

      <Modal
        title="全局搜索"
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        centered
        destroyOnHidden
      >
        <Input
          autoFocus
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          prefix={<Search size={16} aria-hidden="true" />}
          placeholder="搜索页面或导航入口…"
          aria-label="搜索页面或导航入口"
        />
        <div className={styles.searchResults} role="listbox" aria-label="搜索结果">
          {searchResults.map((route, index) => (
            <Button
              key={route.path}
              block
              type="text"
              className={index === activeIndex ? styles.searchResultActive : styles.searchResult}
              role="option"
              aria-selected={index === activeIndex}
              icon={<route.icon size={16} aria-hidden="true" />}
              onClick={() => navigateTo(route.path)}
            >
              <span>{route.label}</span>
              <span className={styles.searchResultHint}>{route.title}</span>
            </Button>
          ))}
          {searchResults.length === 0 && <Typography.Text type="secondary">没有匹配的页面</Typography.Text>}
        </div>
      </Modal>
    </Layout>
  );
}
