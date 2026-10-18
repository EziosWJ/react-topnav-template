import dayjs from 'dayjs';
import type {
  Customer,
  CustomerStatus,
  Order,
  OrderStatus,
  Project,
  ProjectStatus,
  User,
  UserStatus,
} from '../types/entities';

export type StoredProject = Omit<Project, 'customer'>;
export type StoredOrder = Omit<Order, 'customer' | 'project'>;

export interface MockDatabase {
  customers: Customer[];
  projects: StoredProject[];
  orders: StoredOrder[];
  users: User[];
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function dateDaysAgo(days: number): string {
  return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
}

function isoDaysAgo(days: number, hour = 9): string {
  const now = dayjs();
  const candidate = now.subtract(days, 'day').hour(hour).minute(0).second(0).millisecond(0);
  // Same-day seed hours can be later than the current clock; never emit a
  // business timestamp in the future.
  const safe = candidate.isAfter(now) ? now.subtract(1, 'minute') : candidate;
  return safe.toISOString();
}

function dateOffset(days: number): string {
  return dayjs().add(days, 'day').format('YYYY-MM-DD');
}

function isoOffset(days: number, hour = 9): string {
  return dayjs().add(days, 'day').hour(hour).minute(0).second(0).millisecond(0).toISOString();
}

const customerNames = [
  '星海智能科技',
  '云杉数据',
  '恒远制造',
  '蓝湾零售',
  '康泰医疗',
  '启明教育',
  '顺达物流',
  '绿能电力',
  '北辰金融',
  '木棉文化',
  '麒麟软件',
  '海纳供应链',
  '光谷电子',
  '天成建筑',
  '瑞禾农业',
  '卓越咨询',
  '远航旅游',
  '灵动传媒',
  '安捷安防',
  '宏图汽车',
  '新纪元能源',
  '亿联通信',
  '德润环保',
  '中科仪器',
];

const industries = ['信息技术', '制造业', '零售', '医疗健康', '教育', '物流', '能源', '金融', '其他'];
const contactNames = ['王磊', '李雪', '张涛', '陈晨', '刘敏', '杨帆', '周宁', '吴迪', '郑爽', '孙悦', '马超', '朱琳'];
const customerStatuses: CustomerStatus[] = ['active', 'active', 'prospect', 'active', 'inactive'];

const projectNames = [
  'ERP 系统升级',
  '数据中台建设',
  '智能工厂改造',
  '会员运营平台',
  '医疗信息系统',
  '在线学习平台',
  '运输调度系统',
  '能源监控平台',
  '风控中台',
  '数字展厅',
  '协同办公升级',
  '供应链可视化',
  '生产执行系统',
  '工程项目管理',
  '农业物联网',
  '管理咨询项目',
  '旅游预订平台',
  '内容运营平台',
];

const owners = ['张伟', '李娜', '王强', '刘洋', '陈静', '赵敏'];
const projectStatuses: ProjectStatus[] = [
  'in_progress',
  'in_progress',
  'planning',
  'on_hold',
  'completed',
  'in_progress',
  'completed',
  'canceled',
];

const orderStatuses: OrderStatus[] = [
  'pending',
  'paid',
  'completed',
  'pending',
  'draft',
  'completed',
  'paid',
  'canceled',
];

const userSeed = [
  ['张伟', 'zhangwei', '产品研发', '产品经理'],
  ['李娜', 'lina', '销售', '销售经理'],
  ['王强', 'wangqiang', '产品研发', '研发工程师'],
  ['刘洋', 'liuyang', '客户成功', '客户成功经理'],
  ['陈静', 'chenjing', '财务', '财务专员'],
  ['赵敏', 'zhaomin', '人力资源', '人力资源专员'],
  ['孙浩', 'sunhao', '运营', '运营专员'],
  ['周雨', 'zhouyu', '市场', '运营专员'],
  ['吴凡', 'wufan', '产品研发', '研发工程师'],
  ['郑洁', 'zhengjie', '客户成功', '客户成功经理'],
  ['马腾', 'mateng', '销售', '销售经理'],
  ['朱莉', 'zhuli', '财务', '财务专员'],
  ['胡杨', 'huyang', '运营', '运营专员'],
  ['林峰', 'linfeng', '产品研发', '产品经理'],
] as const;

function createCustomers(): Customer[] {
  return customerNames.map((name, index) => {
    // All customers predate the oldest seeded order (360 days), so no related
    // project or order can exist before its customer was created.
    const createdDaysAgo = 600 - index * 8;
    const createdAt = isoDaysAgo(createdDaysAgo, 10);
    const updatedAt = isoDaysAgo(createdDaysAgo - 2, 15);
    return {
      id: `cus_${pad(index + 1)}`,
      name,
      code: `CUS-${pad(index + 1, 3)}`,
      industry: industries[index % industries.length],
      contactName: contactNames[index % contactNames.length],
      phone: `138${pad(1000 + index * 37, 8)}`,
      email: `customer${pad(index + 1)}@example.com`,
      status: customerStatuses[index % customerStatuses.length],
      notes: index % 4 === 0 ? '重点客户，季度回访一次。' : '',
      createdAt,
      updatedAt,
    };
  });
}

function createProjects(customers: Customer[]): StoredProject[] {
  return projectNames.map((name, index) => {
    const status = projectStatuses[index % projectStatuses.length];
    const progressByStatus: Record<ProjectStatus, number> = {
      planning: 5,
      in_progress: 45 + (index % 4) * 10,
      on_hold: 55,
      completed: 100,
      canceled: 20,
    };
    // Dates are coherent with status: planning starts in the future, completed
    // and canceled projects ended in the past, active projects span today.
    let startOffset: number;
    let endOffset: number;
    if (status === 'planning') {
      startOffset = 14 + index * 3;
      endOffset = startOffset + 120 + (index % 3) * 30;
    } else if (status === 'completed' || status === 'canceled') {
      startOffset = -180 - index * 6;
      endOffset = -10 - (index % 5) * 5;
    } else {
      startOffset = -40 - index * 5;
      endOffset = 60 + (index % 4) * 30;
    }
    const createdOffset = status === 'planning' ? -(10 + index) : startOffset - 5;
    // Updated after creation; completed/canceled projects were touched after
    // their end date, active projects were touched recently.
    const updatedOffset =
      status === 'completed' || status === 'canceled'
        ? endOffset + 2
        : status === 'planning'
          ? createdOffset + 5
          : -1;
    return {
      id: `prj_${pad(index + 1)}`,
      name,
      code: `PRJ-${dayjs().format('YYYY')}-${pad(index + 1, 3)}`,
      customerId: customers[index % customers.length].id,
      owner: owners[index % owners.length],
      status,
      progress: progressByStatus[status],
      startDate: dateOffset(startOffset),
      endDate: dateOffset(endOffset),
      budget: 80_000 + index * 27_500,
      notes: index % 3 === 0 ? '需按里程碑交付，验收后进入维护期。' : '',
      createdAt: isoOffset(createdOffset, 11),
      updatedAt: isoOffset(updatedOffset, 16),
    };
  });
}

function createOrders(customers: Customer[], projects: StoredProject[]): StoredOrder[] {
  // Dense recent history makes every dashboard range meaningful.
  const dayOffsets = [0, 1, 2, 3, 4, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 28, 34, 39, 45, 52, 60, 68, 76, 84, 95, 110, 130, 155, 180, 215, 250, 285, 320, 360];

  return dayOffsets.map((offset, index) => {
    const customer = customers[index % customers.length];
    const orderDate = dateDaysAgo(offset);
    const customerProjects = projects.filter(
      (project) =>
        project.customerId === customer.id &&
        project.startDate <= orderDate &&
        project.status !== 'canceled',
    );
    const linkedProject = index % 3 !== 0
      ? customerProjects[index % Math.max(customerProjects.length, 1)]
      : undefined;
    const status = orderStatuses[index % orderStatuses.length];
    return {
      id: `ord_${pad(index + 1)}`,
      orderNo: `ORD-${dayjs(orderDate).format('YYYY')}-${pad(index + 1, 4)}`,
      customerId: customer.id,
      projectId: linkedProject?.id ?? '',
      amount: 12_800 + (index % 9) * 8_650 + (index % 4) * 1_200,
      status,
      orderDate,
      dueDate: dayjs(orderDate).add(30, 'day').format('YYYY-MM-DD'),
      notes: index % 5 === 0 ? '分两期付款，首期已确认。' : '',
      createdAt: isoDaysAgo(offset, 14),
      updatedAt: isoDaysAgo(Math.max(0, offset - 1), 17),
    };
  });
}

function createUsers(): User[] {
  return userSeed.map(([name, username, department, role], index) => {
    const status: UserStatus = index === 6 || index === 12 ? 'disabled' : 'active';
    return {
      id: `usr_${pad(index + 1)}`,
      name,
      username,
      email: `${username}@example.com`,
      department,
      role,
      status,
      lastLoginAt: status === 'active' ? isoDaysAgo(index % 7, 8 + (index % 9)) : null,
      createdAt: isoDaysAgo(400 - index * 18, 10),
      updatedAt: isoDaysAgo(Math.max(1, 60 - index * 3), 15),
    };
  });
}

export function createSeedData(): MockDatabase {
  const customers = createCustomers();
  const projects = createProjects(customers);
  const orders = createOrders(customers, projects);
  const users = createUsers();
  return { customers, projects, orders, users };
}

export const db: MockDatabase = createSeedData();

/** Restores the in-memory demo database. Nothing is persisted across reloads. */
export function resetMockData(): void {
  const next = createSeedData();
  db.customers = next.customers;
  db.projects = next.projects;
  db.orders = next.orders;
  db.users = next.users;
}

export function nextId(prefix: string, records: Array<{ id: string }>): string {
  let max = 0;
  for (const record of records) {
    const numeric = Number(record.id.replace(/^[a-z]+_/, ''));
    if (Number.isFinite(numeric)) max = Math.max(max, numeric);
  }
  return `${prefix}_${pad(max + 1)}`;
}

export function customerRef(customerId: string): { id: string; name: string } | null {
  const customer = db.customers.find((item) => item.id === customerId);
  return customer ? { id: customer.id, name: customer.name } : null;
}

export function serializeProject(project: StoredProject): Project {
  return { ...project, customer: customerRef(project.customerId) };
}

export function serializeOrder(order: StoredOrder): Order {
  const project = db.projects.find((item) => item.id === order.projectId);
  return {
    ...order,
    customer: customerRef(order.customerId),
    project: project ? { id: project.id, name: project.name } : null,
  };
}
