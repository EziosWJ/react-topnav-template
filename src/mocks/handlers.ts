import { HttpResponse, delay, http } from 'msw';
import dayjs from 'dayjs';
import {
  customerStatusMeta,
  orderStatusMeta,
  projectStatusMeta,
  userStatusMeta,
} from '../config/options';
import type { SortOrder } from '../types/api';
import type {
  Customer,
  CustomerStatus,
  DashboardOrderTrendPoint,
  DashboardRange,
  DashboardSummary,
  OrderInput,
  OrderStatus,
  ProjectInput,
  ProjectStatus,
  UserInput,
  UserStatus,
} from '../types/entities';
import { env } from '../config/env';
import { isDateString } from '../utils/format';
import {
  customerRef,
  db,
  nextId,
  serializeOrder,
  serializeProject,
  type StoredOrder,
  type StoredProject,
} from './data';

const API_BASE = env.apiBaseUrl.replace(/\/+$/, '');
const api = (path: string) => `${API_BASE}${path}`;

const latency = env.isTest ? 0 : 180;

function jsonError(status: number, message: string, code?: string, details?: Record<string, unknown>) {
  return HttpResponse.json({ message, ...(code ? { code } : {}), ...(details ? { details } : {}) }, { status });
}

function validationError(details: Record<string, string>) {
  return HttpResponse.json(
    { message: '请检查表单内容后重试。', code: 'VALIDATION_ERROR', details },
    { status: 400 },
  );
}

function notFound(message: string, code: string) {
  return jsonError(404, message, code);
}

function positiveInt(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pageParams(url: URL) {
  const page = positiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(positiveInt(url.searchParams.get('pageSize'), 10), 10_000);
  const keyword = (url.searchParams.get('keyword') ?? '').trim().toLocaleLowerCase();
  const sortOrder: SortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  const sortBy = url.searchParams.get('sortBy') ?? '';
  return { page, pageSize, keyword, sortBy, sortOrder };
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return 1;
  if (right === null || right === undefined || right === '') return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'zh-CN');
}

function sortRecords<T>(
  items: T[],
  sortBy: string,
  sortOrder: SortOrder,
  allowed: readonly string[],
  fallbackField: string,
  getValue: (item: T, field: string) => unknown,
): T[] {
  const field = allowed.includes(sortBy) ? sortBy : fallbackField;
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = getValue(left, field);
    const rightValue = getValue(right, field);
    const leftEmpty = leftValue === null || leftValue === undefined || leftValue === '';
    const rightEmpty = rightValue === null || rightValue === undefined || rightValue === '';
    // Empty values (e.g. never-logged-in users) stay last in both directions.
    if (leftEmpty && rightEmpty) return 0;
    if (leftEmpty) return 1;
    if (rightEmpty) return -1;
    return compareValues(leftValue, rightValue) * direction;
  });
}

function includesKeyword(keyword: string, ...values: Array<string | null | undefined>): boolean {
  if (!keyword) return true;
  return values.some((value) => value?.toLocaleLowerCase().includes(keyword));
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

function unique<T>(items: T[], predicate: (item: T) => boolean): boolean {
  return !items.some(predicate);
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/;

function validateCustomer(body: Record<string, unknown>, excludeId?: string): Record<string, string> {
  const details: Record<string, string> = {};
  const name = readString(body, 'name');
  const code = readString(body, 'code');
  const industry = readString(body, 'industry');
  const contactName = readString(body, 'contactName');
  const phone = readString(body, 'phone');
  const email = readString(body, 'email');
  const status = readString(body, 'status');
  const notes = readString(body, 'notes');

  if (!name || name.length > 50) details.name = '请输入客户名称（最多 50 个字符）';
  if (!/^[A-Za-z0-9-]{3,20}$/.test(code)) details.code = '编码需为 3-20 位字母、数字或短横线';
  else if (!unique(db.customers, (item) => item.code.toLowerCase() === code.toLowerCase() && item.id !== excludeId)) {
    details.code = '客户编码已存在';
  }
  if (!industry) details.industry = '请选择行业';
  if (!contactName || contactName.length > 30) details.contactName = '请输入联系人（最多 30 个字符）';
  if (!phonePattern.test(phone)) details.phone = '请输入有效的手机号码或座机号';
  if (!emailPattern.test(email)) details.email = '请输入有效的邮箱地址';
  if (!(status in customerStatusMeta)) details.status = '请选择有效的客户状态';
  if (notes.length > 500) details.notes = '备注最多 500 个字符';
  return details;
}

function validateProject(body: Record<string, unknown>, excludeId?: string): Record<string, string> {
  const details: Record<string, string> = {};
  const name = readString(body, 'name');
  const code = readString(body, 'code');
  const customerId = readString(body, 'customerId');
  const owner = readString(body, 'owner');
  const status = readString(body, 'status');
  const progress = readNumber(body, 'progress');
  const startDate = readString(body, 'startDate');
  const endDate = readString(body, 'endDate');
  const budget = readNumber(body, 'budget');
  const notes = readString(body, 'notes');

  if (!name || name.length > 60) details.name = '请输入项目名称（最多 60 个字符）';
  if (!/^[A-Za-z0-9-]{3,24}$/.test(code)) details.code = '编码需为 3-24 位字母、数字或短横线';
  else if (!unique(db.projects, (item) => item.code.toLowerCase() === code.toLowerCase() && item.id !== excludeId)) {
    details.code = '项目编码已存在';
  }
  if (!customerId) details.customerId = '请选择关联客户';
  else if (!db.customers.some((item) => item.id === customerId)) details.customerId = '关联客户不存在';
  if (!owner) details.owner = '请选择负责人';
  if (!(status in projectStatusMeta)) details.status = '请选择有效的项目状态';
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) details.progress = '进度需在 0-100 之间';
  if (!isDateString(startDate)) details.startDate = '请选择有效的开始日期';
  if (!isDateString(endDate)) details.endDate = '请选择有效的结束日期';
  if (isDateString(startDate) && isDateString(endDate) && endDate < startDate) {
    details.endDate = '结束日期不能早于开始日期';
  }
  if (!Number.isFinite(budget) || budget < 0) details.budget = '请输入不小于 0 的预算';
  if (notes.length > 500) details.notes = '备注最多 500 个字符';
  return details;
}

function validateOrder(body: Record<string, unknown>, excludeId?: string): Record<string, string> {
  const details: Record<string, string> = {};
  const orderNo = readString(body, 'orderNo');
  const customerId = readString(body, 'customerId');
  const projectId = readString(body, 'projectId');
  const amount = readNumber(body, 'amount');
  const status = readString(body, 'status');
  const orderDate = readString(body, 'orderDate');
  const dueDate = readString(body, 'dueDate');
  const notes = readString(body, 'notes');

  if (!/^[A-Za-z0-9-]{4,32}$/.test(orderNo)) details.orderNo = '订单号需为 4-32 位字母、数字或短横线';
  else if (!unique(db.orders, (item) => item.orderNo.toLowerCase() === orderNo.toLowerCase() && item.id !== excludeId)) {
    details.orderNo = '订单号已存在';
  }
  if (!customerId) details.customerId = '请选择客户';
  else if (!db.customers.some((item) => item.id === customerId)) details.customerId = '关联客户不存在';
  if (projectId) {
    const project = db.projects.find((item) => item.id === projectId);
    if (!project) details.projectId = '关联项目不存在';
    else if (project.customerId !== customerId) details.projectId = '所选项目不属于该客户';
  }
  if (!Number.isFinite(amount) || amount <= 0) details.amount = '金额需大于 0';
  if (!(status in orderStatusMeta)) details.status = '请选择有效的订单状态';
  if (!isDateString(orderDate)) details.orderDate = '请选择有效的下单日期';
  if (!isDateString(dueDate)) details.dueDate = '请选择有效的到期日期';
  if (isDateString(orderDate) && isDateString(dueDate) && dueDate < orderDate) {
    details.dueDate = '到期日期不能早于下单日期';
  }
  if (notes.length > 500) details.notes = '备注最多 500 个字符';
  return details;
}

function validateUser(body: Record<string, unknown>, excludeId?: string): Record<string, string> {
  const details: Record<string, string> = {};
  const name = readString(body, 'name');
  const username = readString(body, 'username');
  const email = readString(body, 'email');
  const department = readString(body, 'department');
  const role = readString(body, 'role');
  const status = readString(body, 'status');

  if (!name || name.length > 30) details.name = '请输入姓名（最多 30 个字符）';
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) {
    details.username = '用户名需以字母开头，3-20 位字母、数字或下划线';
  } else if (!unique(db.users, (item) => item.username.toLowerCase() === username.toLowerCase() && item.id !== excludeId)) {
    details.username = '用户名已存在';
  }
  if (!emailPattern.test(email)) details.email = '请输入有效的邮箱地址';
  else if (!unique(db.users, (item) => item.email.toLowerCase() === email.toLowerCase() && item.id !== excludeId)) {
    details.email = '邮箱已被其他用户使用';
  }
  if (!department) details.department = '请选择部门';
  if (!role) details.role = '请选择角色/岗位';
  if (!(status in userStatusMeta)) details.status = '请选择有效的用户状态';
  return details;
}

function customerInput(body: Record<string, unknown>) {
  return {
    name: readString(body, 'name'),
    code: readString(body, 'code').toUpperCase(),
    industry: readString(body, 'industry'),
    contactName: readString(body, 'contactName'),
    phone: readString(body, 'phone'),
    email: readString(body, 'email').toLowerCase(),
    status: readString(body, 'status') as CustomerStatus,
    notes: readString(body, 'notes'),
  };
}

function projectInput(body: Record<string, unknown>): ProjectInput {
  return {
    name: readString(body, 'name'),
    code: readString(body, 'code').toUpperCase(),
    customerId: readString(body, 'customerId'),
    owner: readString(body, 'owner'),
    status: readString(body, 'status') as ProjectStatus,
    progress: readNumber(body, 'progress'),
    startDate: readString(body, 'startDate'),
    endDate: readString(body, 'endDate'),
    budget: readNumber(body, 'budget'),
    notes: readString(body, 'notes'),
  };
}

function orderInput(body: Record<string, unknown>): OrderInput {
  return {
    orderNo: readString(body, 'orderNo').toUpperCase(),
    customerId: readString(body, 'customerId'),
    projectId: readString(body, 'projectId'),
    amount: readNumber(body, 'amount'),
    status: readString(body, 'status') as OrderStatus,
    orderDate: readString(body, 'orderDate'),
    dueDate: readString(body, 'dueDate'),
    notes: readString(body, 'notes'),
  };
}

function userInput(body: Record<string, unknown>): UserInput {
  return {
    name: readString(body, 'name'),
    username: readString(body, 'username'),
    email: readString(body, 'email').toLowerCase(),
    department: readString(body, 'department'),
    role: readString(body, 'role'),
    status: readString(body, 'status') as UserStatus,
  };
}

function customerReferences(customerId: string) {
  return {
    projects: db.projects
      .filter((project) => project.customerId === customerId)
      .map((project) => ({ id: project.id, name: project.name })),
    orders: db.orders
      .filter((order) => order.customerId === customerId)
      .map((order) => ({ id: order.id, orderNo: order.orderNo })),
  };
}

function dashboardSummary(range: DashboardRange): DashboardSummary {
  const today = dayjs().startOf('day');
  const config: Record<DashboardRange, { label: string; days: number; bucket: 'day' | 'week' | 'month' }> = {
    '30d': { label: '近 30 天', days: 30, bucket: 'day' },
    '90d': { label: '近 90 天', days: 90, bucket: 'week' },
    '12m': { label: '近 12 个月', days: 365, bucket: 'month' },
  };
  const selected = config[range];
  const from =
    selected.bucket === 'month'
      ? today.subtract(11, 'month').startOf('month')
      : today.subtract(selected.days - 1, 'day');
  const to = today;
  const fromString = from.format('YYYY-MM-DD');
  const toString = to.format('YYYY-MM-DD');

  const validOrders = db.orders.filter((order) => {
    return order.status !== 'canceled' && order.orderDate >= fromString && order.orderDate <= toString;
  });

  const buckets: Array<{ label: string; from: string; to: string; orderCount: number; amount: number }> = [];
  if (selected.bucket === 'month') {
    for (let index = 0; index < 12; index += 1) {
      const start = from.add(index, 'month').startOf('month');
      buckets.push({
        label: start.format('YYYY-MM'),
        from: start.format('YYYY-MM-DD'),
        to: start.endOf('month').format('YYYY-MM-DD'),
        orderCount: 0,
        amount: 0,
      });
    }
  } else if (selected.bucket === 'week') {
    for (let index = 0; index < 13; index += 1) {
      const start = from.add(index * 7, 'day');
      const end = index === 12 ? to : start.add(6, 'day');
      buckets.push({
        label: `${start.format('MM-DD')} 起`,
        from: start.format('YYYY-MM-DD'),
        to: end.format('YYYY-MM-DD'),
        orderCount: 0,
        amount: 0,
      });
    }
  } else {
    for (let index = 0; index < selected.days; index += 1) {
      const day = from.add(index, 'day');
      buckets.push({
        label: day.format('MM-DD'),
        from: day.format('YYYY-MM-DD'),
        to: day.format('YYYY-MM-DD'),
        orderCount: 0,
        amount: 0,
      });
    }
  }

  for (const order of validOrders) {
    const bucket = buckets.find((item) => order.orderDate >= item.from && order.orderDate <= item.to);
    if (bucket) {
      bucket.orderCount += 1;
      bucket.amount += order.amount;
    }
  }

  const orderTrend: DashboardOrderTrendPoint[] = buckets.map((bucket) => ({
    label: bucket.label,
    orderCount: bucket.orderCount,
    amount: bucket.amount,
  }));

  const projectStatus = (Object.keys(projectStatusMeta) as ProjectStatus[]).map((status) => ({
    status,
    count: db.projects.filter((project) => project.status === status).length,
  }));

  const recentOrders = [...db.orders]
    .sort((left, right) => right.orderDate.localeCompare(left.orderDate))
    .slice(0, 5)
    .map(serializeOrder);

  return {
    range,
    rangeLabel: selected.label,
    from: fromString,
    to: toString,
    metrics: {
      customerCount: db.customers.length,
      activeProjectCount: db.projects.filter((project) => project.status === 'in_progress').length,
      pendingOrderCount: db.orders.filter((order) => order.status === 'pending').length,
      userCount: db.users.length,
      rangeOrderCount: validOrders.length,
      rangeOrderAmount: validOrders.reduce((sum, order) => sum + order.amount, 0),
    },
    projectStatus,
    orderTrend,
    recentOrders,
  };
}

export const handlers = [
  http.get(api('/customers'), async ({ request }) => {
    await delay(latency);
    const url = new URL(request.url);
    const { page, pageSize, keyword, sortBy, sortOrder } = pageParams(url);
    const status = url.searchParams.get('status') ?? '';
    const industry = url.searchParams.get('industry') ?? '';
    let items = db.customers.filter(
      (customer) =>
        includesKeyword(keyword, customer.name, customer.code, customer.contactName, customer.email, customer.phone) &&
        (!status || customer.status === status) &&
        (!industry || customer.industry === industry),
    );
    items = sortRecords(
      items,
      sortBy,
      sortOrder,
      ['name', 'code', 'industry', 'status', 'createdAt'],
      'createdAt',
      (item, field) => item[field as keyof Customer],
    );
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.post(api('/customers'), async ({ request }) => {
    await delay(latency);
    const body = await readBody(request);
    const details = validateCustomer(body);
    if (Object.keys(details).length > 0) return validationError(details);
    const input = customerInput(body);
    const now = new Date().toISOString();
    const customer: Customer = { id: nextId('cus', db.customers), ...input, createdAt: now, updatedAt: now };
    db.customers.unshift(customer);
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.get(api('/customers/:id/references'), async ({ params }) => {
    await delay(latency);
    const customer = db.customers.find((item) => item.id === params.id);
    if (!customer) return notFound('客户不存在', 'CUSTOMER_NOT_FOUND');
    return HttpResponse.json(customerReferences(customer.id));
  }),

  http.get(api('/customers/:id'), async ({ params }) => {
    await delay(latency);
    const customer = db.customers.find((item) => item.id === params.id);
    return customer ? HttpResponse.json(customer) : notFound('客户不存在', 'CUSTOMER_NOT_FOUND');
  }),

  http.put(api('/customers/:id'), async ({ request, params }) => {
    await delay(latency);
    const index = db.customers.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('客户不存在', 'CUSTOMER_NOT_FOUND');
    const body = await readBody(request);
    const details = validateCustomer(body, String(params.id));
    if (Object.keys(details).length > 0) return validationError(details);
    const current = db.customers[index];
    db.customers[index] = { ...current, ...customerInput(body), id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    return HttpResponse.json(db.customers[index]);
  }),

  http.delete(api('/customers/:id'), async ({ params }) => {
    await delay(latency);
    const index = db.customers.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('客户不存在', 'CUSTOMER_NOT_FOUND');
    const references = customerReferences(db.customers[index].id);
    if (references.projects.length > 0 || references.orders.length > 0) {
      return jsonError(
        409,
        '该客户仍有关联项目或订单，无法删除。请先调整关联数据。',
        'CUSTOMER_HAS_REFERENCES',
        { references },
      );
    }
    db.customers.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/projects'), async ({ request }) => {
    await delay(latency);
    const url = new URL(request.url);
    const { page, pageSize, keyword, sortBy, sortOrder } = pageParams(url);
    const customerId = url.searchParams.get('customerId') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const owner = url.searchParams.get('owner') ?? '';
    const startDateFrom = url.searchParams.get('startDateFrom') ?? '';
    const startDateTo = url.searchParams.get('startDateTo') ?? '';
    let items = db.projects.filter((project) => {
      const customer = customerRef(project.customerId);
      return (
        includesKeyword(keyword, project.name, project.code, project.owner, customer?.name) &&
        (!customerId || project.customerId === customerId) &&
        (!status || project.status === status) &&
        (!owner || project.owner === owner) &&
        (!startDateFrom || project.startDate >= startDateFrom) &&
        (!startDateTo || project.startDate <= startDateTo)
      );
    });
    items = sortRecords(
      items,
      sortBy,
      sortOrder,
      ['name', 'code', 'owner', 'status', 'progress', 'startDate', 'endDate', 'budget', 'createdAt'],
      'createdAt',
      (item, field) => item[field as keyof StoredProject],
    );
    return HttpResponse.json({
      ...paginate(items, page, pageSize),
      items: items.slice((page - 1) * pageSize, page * pageSize).map(serializeProject),
    });
  }),

  http.post(api('/projects'), async ({ request }) => {
    await delay(latency);
    const body = await readBody(request);
    const details = validateProject(body);
    if (Object.keys(details).length > 0) return validationError(details);
    const now = new Date().toISOString();
    const project: StoredProject = { id: nextId('prj', db.projects), ...projectInput(body), createdAt: now, updatedAt: now };
    db.projects.unshift(project);
    return HttpResponse.json(serializeProject(project), { status: 201 });
  }),

  http.get(api('/projects/:id'), async ({ params }) => {
    await delay(latency);
    const project = db.projects.find((item) => item.id === params.id);
    return project ? HttpResponse.json(serializeProject(project)) : notFound('项目不存在', 'PROJECT_NOT_FOUND');
  }),

  http.put(api('/projects/:id'), async ({ request, params }) => {
    await delay(latency);
    const index = db.projects.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('项目不存在', 'PROJECT_NOT_FOUND');
    const body = await readBody(request);
    const details = validateProject(body, String(params.id));
    if (Object.keys(details).length > 0) return validationError(details);
    const input = projectInput(body);
    const current = db.projects[index];
    if (
      input.customerId !== current.customerId &&
      db.orders.some((order) => order.projectId === current.id)
    ) {
      return jsonError(409, '该项目已被订单引用，无法更换关联客户。', 'PROJECT_HAS_ORDERS');
    }
    db.projects[index] = { ...current, ...input, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    return HttpResponse.json(serializeProject(db.projects[index]));
  }),

  http.delete(api('/projects/:id'), async ({ params }) => {
    await delay(latency);
    const index = db.projects.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('项目不存在', 'PROJECT_NOT_FOUND');
    const referenced = db.orders.filter((order) => order.projectId === db.projects[index].id);
    if (referenced.length > 0) {
      return jsonError(409, '该项目已被订单引用，无法删除。请先调整关联订单。', 'PROJECT_HAS_ORDERS', {
        orders: referenced.map((order) => ({ id: order.id, orderNo: order.orderNo })),
      });
    }
    db.projects.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/orders'), async ({ request }) => {
    await delay(latency);
    const url = new URL(request.url);
    const { page, pageSize, keyword, sortBy, sortOrder } = pageParams(url);
    const status = url.searchParams.get('status') ?? '';
    const customerId = url.searchParams.get('customerId') ?? '';
    const projectId = url.searchParams.get('projectId') ?? '';
    const orderDateFrom = url.searchParams.get('orderDateFrom') ?? '';
    const orderDateTo = url.searchParams.get('orderDateTo') ?? '';
    let items = db.orders.filter((order) => {
      const customer = customerRef(order.customerId);
      const project = db.projects.find((item) => item.id === order.projectId);
      return (
        includesKeyword(keyword, order.orderNo, customer?.name, project?.name) &&
        (!status || order.status === status) &&
        (!customerId || order.customerId === customerId) &&
        (!projectId || order.projectId === projectId) &&
        (!orderDateFrom || order.orderDate >= orderDateFrom) &&
        (!orderDateTo || order.orderDate <= orderDateTo)
      );
    });
    items = sortRecords(
      items,
      sortBy,
      sortOrder,
      ['orderNo', 'amount', 'status', 'orderDate', 'dueDate', 'createdAt'],
      'createdAt',
      (item, field) => item[field as keyof StoredOrder],
    );
    const paged = paginate(items, page, pageSize);
    return HttpResponse.json({ ...paged, items: paged.items.map(serializeOrder) });
  }),

  http.post(api('/orders'), async ({ request }) => {
    await delay(latency);
    const body = await readBody(request);
    const details = validateOrder(body);
    if (Object.keys(details).length > 0) return validationError(details);
    const now = new Date().toISOString();
    const order: StoredOrder = { id: nextId('ord', db.orders), ...orderInput(body), createdAt: now, updatedAt: now };
    db.orders.unshift(order);
    return HttpResponse.json(serializeOrder(order), { status: 201 });
  }),

  http.get(api('/orders/:id'), async ({ params }) => {
    await delay(latency);
    const order = db.orders.find((item) => item.id === params.id);
    return order ? HttpResponse.json(serializeOrder(order)) : notFound('订单不存在', 'ORDER_NOT_FOUND');
  }),

  http.put(api('/orders/:id'), async ({ request, params }) => {
    await delay(latency);
    const index = db.orders.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('订单不存在', 'ORDER_NOT_FOUND');
    const body = await readBody(request);
    const details = validateOrder(body, String(params.id));
    if (Object.keys(details).length > 0) return validationError(details);
    const current = db.orders[index];
    db.orders[index] = { ...current, ...orderInput(body), id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    return HttpResponse.json(serializeOrder(db.orders[index]));
  }),

  http.delete(api('/orders/:id'), async ({ params }) => {
    await delay(latency);
    const index = db.orders.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('订单不存在', 'ORDER_NOT_FOUND');
    db.orders.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/users'), async ({ request }) => {
    await delay(latency);
    const url = new URL(request.url);
    const { page, pageSize, keyword, sortBy, sortOrder } = pageParams(url);
    const department = url.searchParams.get('department') ?? '';
    const role = url.searchParams.get('role') ?? '';
    const status = url.searchParams.get('status') ?? '';
    let items = db.users.filter(
      (user) =>
        includesKeyword(keyword, user.name, user.username, user.email, user.department, user.role) &&
        (!department || user.department === department) &&
        (!role || user.role === role) &&
        (!status || user.status === status),
    );
    items = sortRecords(
      items,
      sortBy,
      sortOrder,
      ['name', 'username', 'email', 'department', 'role', 'status', 'lastLoginAt', 'createdAt'],
      'createdAt',
      (item, field) => item[field as keyof (typeof db.users)[number]],
    );
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.post(api('/users'), async ({ request }) => {
    await delay(latency);
    const body = await readBody(request);
    const details = validateUser(body);
    if (Object.keys(details).length > 0) return validationError(details);
    const now = new Date().toISOString();
    const user = {
      id: nextId('usr', db.users),
      ...userInput(body),
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    db.users.unshift(user);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.get(api('/users/:id'), async ({ params }) => {
    await delay(latency);
    const user = db.users.find((item) => item.id === params.id);
    return user ? HttpResponse.json(user) : notFound('用户不存在', 'USER_NOT_FOUND');
  }),

  http.put(api('/users/:id'), async ({ request, params }) => {
    await delay(latency);
    const index = db.users.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('用户不存在', 'USER_NOT_FOUND');
    const body = await readBody(request);
    const details = validateUser(body, String(params.id));
    if (Object.keys(details).length > 0) return validationError(details);
    const current = db.users[index];
    db.users[index] = { ...current, ...userInput(body), id: current.id, createdAt: current.createdAt, lastLoginAt: current.lastLoginAt, updatedAt: new Date().toISOString() };
    return HttpResponse.json(db.users[index]);
  }),

  http.delete(api('/users/:id'), async ({ params }) => {
    await delay(latency);
    const index = db.users.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound('用户不存在', 'USER_NOT_FOUND');
    db.users.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/dashboard/summary'), async ({ request }) => {
    await delay(latency);
    const url = new URL(request.url);
    const requested = url.searchParams.get('range');
    const range: DashboardRange = requested === '90d' || requested === '12m' ? requested : '30d';
    return HttpResponse.json(dashboardSummary(range));
  }),
];
