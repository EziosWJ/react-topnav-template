import type { EntityReference, ListQuery } from './api';

export type CustomerStatus = 'active' | 'inactive' | 'prospect';

export interface Customer {
  id: string;
  name: string;
  code: string;
  industry: string;
  contactName: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  code: string;
  industry: string;
  contactName: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  notes: string;
}

export interface CustomerListQuery extends ListQuery {
  status?: CustomerStatus;
  industry?: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'canceled';

export interface Project {
  id: string;
  name: string;
  code: string;
  customerId: string;
  customer: EntityReference | null;
  owner: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  code: string;
  customerId: string;
  owner: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  notes: string;
}

export interface ProjectListQuery extends ListQuery {
  customerId?: string;
  status?: ProjectStatus;
  owner?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

export type OrderStatus = 'draft' | 'pending' | 'paid' | 'completed' | 'canceled';

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customer: EntityReference | null;
  projectId: string;
  project: EntityReference | null;
  amount: number;
  status: OrderStatus;
  orderDate: string;
  dueDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderInput {
  orderNo: string;
  customerId: string;
  projectId: string;
  amount: number;
  status: OrderStatus;
  orderDate: string;
  dueDate: string;
  notes: string;
}

export interface OrderListQuery extends ListQuery {
  status?: OrderStatus;
  customerId?: string;
  projectId?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
}

export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  department: string;
  role: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  name: string;
  username: string;
  email: string;
  department: string;
  role: string;
  status: UserStatus;
}

export interface UserListQuery extends ListQuery {
  department?: string;
  role?: string;
  status?: UserStatus;
}

export type DashboardRange = '30d' | '90d' | '12m';

export interface DashboardMetrics {
  customerCount: number;
  activeProjectCount: number;
  pendingOrderCount: number;
  userCount: number;
  rangeOrderCount: number;
  rangeOrderAmount: number;
}

export interface DashboardProjectStatusBucket {
  status: ProjectStatus;
  count: number;
}

export interface DashboardOrderTrendPoint {
  label: string;
  orderCount: number;
  amount: number;
}

export interface DashboardSummary {
  range: DashboardRange;
  rangeLabel: string;
  from: string;
  to: string;
  metrics: DashboardMetrics;
  projectStatus: DashboardProjectStatusBucket[];
  orderTrend: DashboardOrderTrendPoint[];
  recentOrders: Order[];
}
