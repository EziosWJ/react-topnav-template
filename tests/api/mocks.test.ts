import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { customersApi, fetchAllCustomers } from '../../src/features/customers/api';
import { projectsApi } from '../../src/features/projects/api';
import { ordersApi } from '../../src/features/orders/api';
import { usersApi } from '../../src/features/users/api';
import { dashboardApi } from '../../src/features/dashboard/api';
import { db } from '../../src/mocks/data';
import { normalizeApiError } from '../../src/lib/api/errors';
import type { OrderInput } from '../../src/types/entities';

const baseCustomerInput = {
  name: '测试客户',
  code: 'CUS-900',
  industry: '信息技术',
  contactName: '测试联系人',
  phone: '13900001111',
  email: 'test-customer@example.com',
  status: 'active' as const,
  notes: '自动化测试',
};

describe('seed data integrity', () => {
  it('never emits created/updated/login timestamps in the future', () => {
    const now = Date.now();
    const timestamps = [
      ...db.customers.flatMap((item) => [item.createdAt, item.updatedAt]),
      ...db.projects.flatMap((item) => [item.createdAt, item.updatedAt]),
      ...db.orders.flatMap((item) => [item.createdAt, item.updatedAt]),
      ...db.users.flatMap((item) => [
        item.createdAt,
        item.updatedAt,
        ...(item.lastLoginAt ? [item.lastLoginAt] : []),
      ]),
    ];
    expect(timestamps.length).toBeGreaterThan(0);
    for (const value of timestamps) {
      expect(Date.parse(value), value).toBeLessThanOrEqual(now);
    }
  });
});

describe('customer API and MSW query behaviour', () => {
  it('paginates, filters, searches and sorts on the handler side', async () => {
    const first = await customersApi.list({ page: 1, pageSize: 5 });
    const second = await customersApi.list({ page: 2, pageSize: 5 });
    expect(first.total).toBe(24);
    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    expect(second.items.map((item) => item.id)).not.toEqual(first.items.map((item) => item.id));

    const prospects = await customersApi.list({ page: 1, pageSize: 100, status: 'prospect' });
    expect(prospects.items.length).toBeGreaterThan(0);
    expect(prospects.items.every((item) => item.status === 'prospect')).toBe(true);

    const search = await customersApi.list({ page: 1, pageSize: 10, keyword: '星海' });
    expect(search.total).toBe(1);
    expect(search.items[0].name).toBe('星海智能科技');

    const ascending = await customersApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
    const descending = await customersApi.list({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'desc' });
    expect(ascending.items[0].name.localeCompare(descending.items[0].name, 'zh-CN')).toBeLessThanOrEqual(0);

    const fallback = await customersApi.list({
      page: 1,
      pageSize: 3,
      sortBy: 'not-a-field',
      sortOrder: 'asc',
    });
    expect(fallback.items).toHaveLength(3);
  });

  it('creates, reads, updates and deletes a customer', async () => {
    const created = await customersApi.create(baseCustomerInput);
    expect(created.id).toMatch(/^cus_/);
    expect(created.code).toBe('CUS-900');

    const fetched = await customersApi.get(created.id);
    expect(fetched.email).toBe('test-customer@example.com');

    const updated = await customersApi.update(created.id, {
      ...baseCustomerInput,
      name: '测试客户（更新）',
      status: 'prospect',
    });
    expect(updated.name).toBe('测试客户（更新）');
    expect(updated.status).toBe('prospect');

    await customersApi.remove(created.id);
    await expect(customersApi.get(created.id)).rejects.toMatchObject({ status: 404 });
  });

  it('reports validation errors and blocks deleting referenced customers', async () => {
    const duplicateError = await customersApi
      .create({ ...baseCustomerInput, code: 'CUS-001' })
      .catch((error: unknown) => error);
    expect(normalizeApiError(duplicateError)).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });

    const deleteError = await customersApi.remove('cus_01').catch((error: unknown) => error);
    const normalizedDelete = normalizeApiError(deleteError);
    expect(normalizedDelete.status).toBe(409);
    expect(normalizedDelete.code).toBe('CUSTOMER_HAS_REFERENCES');
    expect(normalizedDelete.message).toContain('无法删除');

    const references = await customersApi.references('cus_01');
    expect(references.projects.length + references.orders.length).toBeGreaterThan(0);
  });

  it('exports every filtered record rather than only the visible page', async () => {
    const all = await fetchAllCustomers({ page: 1, pageSize: 10 });
    expect(all).toHaveLength(24);
  });
});

describe('project, order and user APIs', () => {
  it('filters projects by customer and keeps embedded references', async () => {
    const customerId = db.customers[0].id;
    const response = await projectsApi.list({ page: 1, pageSize: 100, customerId });
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items.every((project) => project.customerId === customerId)).toBe(true);
    expect(response.items.every((project) => project.customer?.id === customerId)).toBe(true);
  });

  it('filters orders by status and date range and formats embedded customer/project', async () => {
    const pending = await ordersApi.list({ page: 1, pageSize: 100, status: 'pending' });
    expect(pending.items.length).toBeGreaterThan(0);
    expect(pending.items.every((order) => order.status === 'pending')).toBe(true);

    const dateFrom = dayjs().subtract(10, 'day').format('YYYY-MM-DD');
    const recent = await ordersApi.list({ page: 1, pageSize: 100, orderDateFrom: dateFrom });
    expect(recent.items.every((order) => order.orderDate >= dateFrom)).toBe(true);

    const linked = await ordersApi.list({ page: 1, pageSize: 100 });
    const withProject = linked.items.find((order) => order.projectId);
    expect(withProject?.project?.id).toBe(withProject?.projectId);
  });

  it('keeps never-logged-in users last when sorting by last login', async () => {
    const descending = await usersApi.list({
      page: 1,
      pageSize: 100,
      sortBy: 'lastLoginAt',
      sortOrder: 'desc',
    });
    const last = descending.items.at(-1);
    expect(last?.lastLoginAt).toBeNull();
    expect(descending.items.slice(0, -2).every((user) => user.lastLoginAt !== null)).toBe(true);
  });

  it('filters users by department and prevents duplicate usernames', async () => {
    const response = await usersApi.list({ page: 1, pageSize: 100, department: '产品研发' });
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items.every((user) => user.department === '产品研发')).toBe(true);

    const duplicateUserError = await usersApi
      .create({
        name: '重复用户',
        username: 'zhangwei',
        email: 'unique-new@example.com',
        department: '销售',
        role: '销售经理',
        status: 'active',
      })
      .catch((error: unknown) => error);
    const normalizedUser = normalizeApiError(duplicateUserError);
    expect(normalizedUser.status).toBe(400);
    expect(JSON.stringify(normalizedUser.details)).toContain('用户名已存在');
  });

  it('blocks deleting projects referenced by orders', async () => {
    const referenced = db.orders.find((order) => order.projectId);
    expect(referenced).toBeDefined();
    const deleteProjectError = await projectsApi.remove(referenced!.projectId).catch((error: unknown) => error);
    expect(normalizeApiError(deleteProjectError)).toMatchObject({
      status: 409,
      code: 'PROJECT_HAS_ORDERS',
    });
  });

  it('validates that a project belongs to the selected customer', async () => {
    const customer = db.customers[0];
    const foreignProject = db.projects.find((project) => project.customerId !== customer.id);
    expect(foreignProject).toBeDefined();

    const input: OrderInput = {
      orderNo: 'TEST-ORDER-1',
      customerId: customer.id,
      projectId: foreignProject!.id,
      amount: 100,
      status: 'pending',
      orderDate: dayjs().format('YYYY-MM-DD'),
      dueDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      notes: '',
    };
    const mismatchError = await ordersApi.create(input).catch((error: unknown) => error);
    const normalizedMismatch = normalizeApiError(mismatchError);
    expect(normalizedMismatch.status).toBe(400);
    expect(normalizedMismatch.details?.projectId).toBeTruthy();
  });
});

describe('dashboard summary', () => {
  it('derives metrics and charts from the same in-memory business data', async () => {
    const summary = await dashboardApi.summary('30d');
    expect(summary.metrics.customerCount).toBe(db.customers.length);
    expect(summary.metrics.userCount).toBe(db.users.length);
    expect(summary.metrics.activeProjectCount).toBe(
      db.projects.filter((project) => project.status === 'in_progress').length,
    );
    expect(summary.metrics.pendingOrderCount).toBe(
      db.orders.filter((order) => order.status === 'pending').length,
    );
    expect(summary.projectStatus.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(db.projects.length);
    expect(summary.orderTrend).toHaveLength(30);
    expect(summary.recentOrders).toHaveLength(5);
  });

  it('refreshes related metrics after mutations', async () => {
    const before = await dashboardApi.summary('30d');
    const order = await ordersApi.create({
      orderNo: 'TEST-ORDER-2',
      customerId: db.customers[0].id,
      projectId: '',
      amount: 5000,
      status: 'pending',
      orderDate: dayjs().format('YYYY-MM-DD'),
      dueDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      notes: '',
    });
    const after = await dashboardApi.summary('30d');
    expect(after.metrics.pendingOrderCount).toBe(before.metrics.pendingOrderCount + 1);
    expect(after.metrics.rangeOrderCount).toBe(before.metrics.rangeOrderCount + 1);

    await ordersApi.remove(order.id);
    const restored = await dashboardApi.summary('30d');
    expect(restored.metrics.pendingOrderCount).toBe(before.metrics.pendingOrderCount);
  });

  it('supports all documented ranges', async () => {
    const ninety = await dashboardApi.summary('90d');
    const year = await dashboardApi.summary('12m');
    expect(ninety.orderTrend).toHaveLength(13);
    expect(year.orderTrend).toHaveLength(12);
    expect(ninety.rangeLabel).toBe('近 90 天');
    expect(year.rangeLabel).toBe('近 12 个月');
  });
});

describe('full CRUD chain and reference release', () => {
  it('creates, updates and deletes across all entities while guarding references', async () => {
    const customer = await customersApi.create({
      ...baseCustomerInput,
      code: 'CUS-901',
      email: 'chain-customer@example.com',
    });

    const project = await projectsApi.create({
      name: '链路测试项目',
      code: 'PRJ-CHAIN-1',
      customerId: customer.id,
      owner: '张伟',
      status: 'planning',
      progress: 5,
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
      budget: 1000,
      notes: '',
    });

    const updatedProject = await projectsApi.update(project.id, {
      name: '链路测试项目（更新）',
      code: project.code,
      customerId: customer.id,
      owner: '李娜',
      status: 'in_progress',
      progress: 40,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: 2500.5,
      notes: '已启动',
    });
    expect(updatedProject).toMatchObject({ name: '链路测试项目（更新）', progress: 40, owner: '李娜' });

    const order = await ordersApi.create({
      orderNo: 'CHAIN-ORDER-1',
      customerId: customer.id,
      projectId: project.id,
      amount: 880.5,
      status: 'draft',
      orderDate: dayjs().format('YYYY-MM-DD'),
      dueDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
      notes: '',
    });
    const updatedOrder = await ordersApi.update(order.id, {
      orderNo: order.orderNo,
      customerId: customer.id,
      projectId: project.id,
      amount: 990,
      status: 'paid',
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      notes: '已支付',
    });
    expect(updatedOrder).toMatchObject({ amount: 990, status: 'paid', project: { id: project.id } });

    const guardedProjectDelete = await projectsApi.remove(project.id).catch((error: unknown) => error);
    expect(normalizeApiError(guardedProjectDelete)).toMatchObject({ status: 409 });

    const guardedCustomerDelete = await customersApi.remove(customer.id).catch((error: unknown) => error);
    expect(normalizeApiError(guardedCustomerDelete)).toMatchObject({ status: 409 });

    await ordersApi.remove(order.id);
    await projectsApi.remove(project.id);
    await customersApi.remove(customer.id);
    await expect(customersApi.get(customer.id)).rejects.toMatchObject({ status: 404 });

    const user = await usersApi.create({
      name: '链路用户',
      username: 'chain_user',
      email: 'chain-user@example.com',
      department: '运营',
      role: '运营专员',
      status: 'active',
    });
    const updatedUser = await usersApi.update(user.id, {
      name: '链路用户（更新）',
      username: 'chain_user',
      email: 'chain-user@example.com',
      department: '客户成功',
      role: '客户成功经理',
      status: 'disabled',
    });
    expect(updatedUser).toMatchObject({ department: '客户成功', status: 'disabled' });
    await usersApi.remove(user.id);
    await expect(usersApi.get(user.id)).rejects.toMatchObject({ status: 404 });
  });
});
