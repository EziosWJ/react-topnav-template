import { describe, expect, it } from 'vitest';
import {
  getBreadcrumbTrail,
  getCommandItems,
  getNavigation,
  getNavigationRoute,
  matchRoute,
  routeDefinitions,
} from '../../src/config/routes';

describe('centralized route configuration', () => {
  it('derives the dashboard and grouped navigation from one table', () => {
    const navigation = getNavigation();
    expect(navigation.dashboard?.path).toBe('/');
    expect(navigation.groups.map((group) => group.label)).toEqual(['业务管理', '系统管理']);
    expect(navigation.groups[0].items.map((item) => item.path)).toEqual(['/customers', '/projects', '/orders']);
    expect(navigation.groups[1].items.map((item) => item.path)).toEqual(['/users']);
  });

  it('matches the most specific route', () => {
    expect(matchRoute('/')?.path).toBe('/');
    expect(matchRoute('/customers')?.path).toBe('/customers');
    expect(matchRoute('/customers/cus_01')?.path).toBe('/customers/:id');
    expect(matchRoute('/customers/cus_01/edit')?.path).toBe('/customers/:id/edit');
    expect(matchRoute('/missing')).toBeUndefined();
  });

  it('keeps list navigation active on detail and edit routes', () => {
    expect(getNavigationRoute('/customers/cus_01/edit')?.path).toBe('/customers');
    expect(getNavigationRoute('/orders/ord_01')?.path).toBe('/orders');
    expect(getNavigationRoute('/users/new')?.path).toBe('/users');
  });

  it('builds breadcrumbs with live ids for parent links', () => {
    const trail = getBreadcrumbTrail('/customers/cus_01/edit');
    expect(trail.map((entry) => entry.title)).toEqual(['仪表盘', '客户管理', '客户详情', '编辑客户']);
    expect(trail.find((entry) => entry.title === '客户管理')?.path).toBe('/customers');
    expect(trail.find((entry) => entry.title === '客户详情')?.path).toBe('/customers/cus_01');
    expect(trail.at(-1)?.path).toBeUndefined();
  });

  it('searches routes and quick actions but not id-specific detail pages', () => {
    const items = getCommandItems();
    expect(items.some((item) => item.path === '/customers')).toBe(true);
    expect(items.some((item) => item.path === '/customers/new')).toBe(true);
    expect(items.some((item) => item.path.includes(':id'))).toBe(false);

    const routes = routeDefinitions.map((route) => route.path);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
