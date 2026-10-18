# React Topnav Template

面向企业业务系统的顶部导航管理后台脚手架。项目使用 React + TypeScript + Vite 构建，内置仪表盘、客户、项目、订单、用户四个业务模块，以及完整的列表筛选、URL 状态、CRUD、导出、模拟上传、主题和响应式导航。所有业务数据均来自 MSW 内存模拟，不连接真实后端，不包含登录、认证或权限系统。

## 功能概览

- **顶部导航**：sticky 单行三段式布局，品牌 / 一级导航 / 搜索与主题工具；一级导航使用下拉子菜单。
- **响应式导航**：窄屏隐藏横向菜单，使用汉堡按钮打开侧边 Drawer；Drawer 内保留品牌、搜索入口和主题切换。
- **命令搜索**：点击搜索按钮、`Ctrl+K` 或 macOS 的 `⌘K` 打开；支持 `↑` / `↓` 选择、`Enter` 跳转和 `Esc` 关闭。
- **主题系统**：首次访问跟随操作系统，手动切换后保存到 `localStorage`；浅色/深色主题基于 Ant Design Design Token。
- **仪表盘**：客户/项目/订单/用户 KPI、项目状态分布、订单数量与金额趋势、最近订单；KPI 可跳转到带筛选条件的列表。
- **四个业务模块**：列表、详情、新建、编辑、删除、表单校验、关联引用和降级提示。
- **列表交互**：分页、关键词、筛选、排序、重置、列显隐、三档密度、当前页/跨分页选择，全部与 URL query 同步。
- **导出**：CSV / XLSX，支持当前筛选的全部结果或选中行；文件名包含模块名和日期。
- **模拟上传**：文件类型/大小/数量校验、进度、成功/失败、重试和预览；文件不会离开浏览器。
- **状态完整**：每个页面均提供加载、空数据、请求失败和重试状态；危险操作二次确认。
- 本模板**不包含应用内页面标签栏**。

## 技术栈

- React 19.3、TypeScript、Vite、pnpm
- Ant Design 6 + CSS Modules + Design Token（不使用 Tailwind）
- React Router Data Router（`createBrowserRouter` + `RouterProvider`，页面 `React.lazy` + `Suspense`）
- TanStack Query 5（服务端状态）
- Zustand 5（按需用于跨组件客户端状态；本实现的列表状态统一放在 URL 中）
- Axios（HTTP 客户端，默认超时 15 秒）
- MSW 2（内存模拟 API）
- Lucide React（图标）、Ant Design Charts（图表）、Day.js（日期）、ExcelJS（XLSX）
- Vitest + React Testing Library + `@vitest/coverage-v8`

## 环境要求

- Node.js `>= 22.12.0`
- pnpm `>= 10`

## 安装与启动

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # 按需修改
pnpm dev
```

打开终端输出的本地地址。开发环境默认启用 MSW，因此在没有后端的情况下也能完整演示。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（默认启用 MSW） |
| `pnpm build` | TypeScript 项目检查并构建生产静态资源 |
| `pnpm preview` | 预览生产构建 |
| `pnpm lint` | 运行 ESLint（含 `eslint-plugin-jsx-a11y`） |
| `pnpm typecheck` | 执行 TypeScript 项目检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 生成 `coverage/` 覆盖率报告 |
| `pnpm test:watch` | 监听模式运行测试 |

## 环境变量

变量集中读取于 `src/config/env.ts`，业务代码不直接访问 `import.meta.env`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_BASE_PATH` | `/` | 部署基路径，支持子路径部署，例如 `/admin` |
| `VITE_API_BASE_URL` | `/api` | Axios Base URL；业务 API 模块不硬编码该值 |
| `VITE_ENABLE_MSW` | 开发环境 `true`，生产环境 `false` | 显式控制 MSW。支持 `1/true/yes/on` 与 `0/false/no/off` |

生产构建默认**不会**启动 mock worker。若需要在生产预览中演示模拟数据，显式设置 `VITE_ENABLE_MSW=true` 后重新构建。子路径部署时，MSW Service Worker 的作用域位于该子路径下，`VITE_API_BASE_URL` 应指向同一作用域内的地址。

使用 `createBrowserRouter` 部署静态站点时，需要在 Web 服务器上把未知路径回退到 `index.html`，以保证直接刷新深层 URL 仍可加载应用。

## 主要路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 经营总览 | KPI、图表、最近订单，支持 30 天 / 90 天 / 12 个月范围 |
| `/customers` | 客户列表 | 搜索、状态/行业筛选、排序、导出、模拟导入 |
| `/customers/new` | 新建客户 | 独立表单页；列表中也提供 Drawer 新建 |
| `/customers/:id` | 客户详情 | 基本信息、关联项目与订单 |
| `/customers/:id/edit` | 编辑客户 | 独立编辑表单 |
| `/projects` | 项目列表 | 客户/状态/负责人/开始日期筛选 |
| `/projects/new`、`/projects/:id`、`/projects/:id/edit` | 项目新建/详情/编辑 | 客户关联与进度展示 |
| `/orders` | 订单列表 | 客户/状态/下单日期筛选，支持 `customerId`、`projectId` 深链筛选 |
| `/orders/new`、`/orders/:id`、`/orders/:id/edit` | 订单新建/详情/编辑 | 客户与可选项目关联 |
| `/users` | 用户列表 | 部门/角色/状态筛选，启用/停用与删除确认 |
| `/users/new`、`/users/:id`、`/users/:id/edit` | 用户新建/详情/编辑 | 业务用户资料，不涉及真实账号 |

菜单、面包屑、页面标题和命令搜索项统一由 `src/config/routes.tsx` 派生，不在页面中分别硬编码。

## 列表 URL 状态

四个列表的已提交关键词、筛选、排序和分页都会写入 URL，例如：

```text
/customers?page=2&pageSize=20&keyword=星海&status=active&industry=信息技术&sortBy=name&sortOrder=asc
```

- 刷新、复制链接、浏览器前进/后退都会恢复对应列表状态。
- 关键词在点击“搜索”后提交；筛选与排序变更后立即写入 URL。
- 非法 `page` / `pageSize` / `sortBy` / `sortOrder` / 日期值会回退到安全默认值，不会导致页面崩溃。
- “重置”会清除关键词、筛选、排序和分页参数。
- 列表状态不写入 Zustand；Zustand 仅保留给确实需要跨组件共享的客户端状态。

## 模拟 API 与数据

- 实现位于 `src/mocks/`：`handlers.ts`、`data.ts`、`browser.ts`、`server.ts`、`enable.ts`。
- 数据仅保存在内存中，**刷新页面后重置**；不写入 `localStorage`，也不伪装成真实持久化。
- 种子数据包含跨实体引用：项目关联客户，订单关联客户并可选关联项目。
- 删除仍有项目/订单的客户、或仍被订单引用的项目，会返回 `409` 并阻止删除；页面会展示明确提示。
- API 契约统一为分页响应 + 统一错误体 `{ message, code?, details? }`。
- 列表查询参数会传给 MSW handler，并影响返回结果；创建/更新/删除后 TanStack Query 会刷新相关列表、详情与仪表盘缓存。

主要模拟接口：

```text
GET/POST        /api/customers
GET/PUT/DELETE  /api/customers/:id
GET             /api/customers/:id/references
GET/POST        /api/projects
GET/PUT/DELETE  /api/projects/:id
GET/POST        /api/orders
GET/PUT/DELETE  /api/orders/:id
GET/POST        /api/users
GET/PUT/DELETE  /api/users/:id
GET             /api/dashboard/summary?range=30d|90d|12m
```

## 导出与模拟上传

- CSV 使用 UTF-8 BOM，Excel 可直接打开中文；XLSX 由 ExcelJS 生成，金额列带数字格式。
- 导出默认获取**当前筛选条件下的全部数据**（通过分页遍历），不受当前页限制；“导出选中”使用表格当前选择，支持跨分页选择。
- 文件名格式：`客户-2026-10-18.csv`、`订单-2026-10-18.xlsx`。
- 客户列表提供“批量导入（模拟）”示例：
  - 支持 `.csv` / `.xlsx`，单文件不超过 5 MB，最多 3 个；
  - 使用 Ant Design Upload，仅本地模拟进度，不上传服务器、不写入业务数据；
  - 文件名包含 `fail`（例如 `broken-fail.csv`）可验证失败与重试流程。

## 目录结构

```text
src/
  app/          Providers、路由装配、运行时错误边界
  config/       环境变量、品牌、集中路由/导航、状态与下拉选项、共享文案
                （copy.ts）与 Day.js 中文 locale
  layouts/      顶部导航应用布局
  components/   公共组件（PageHeader、SearchFilterBar、DataTable、StatusTag、
                AsyncState、FormDrawer、FormPage、DetailFields、ExportButton、
                MockUpload、CommandPalette、页面模板）
  features/     按业务模块组织的 API、Query hooks、表单与选择器
  hooks/        URL 列表状态、防抖、导出、确认弹窗等共享 hooks
  lib/api/      Axios 客户端、错误规范化、QueryClient、分页抓取工具
  lib/query/    统一 query keys 与缓存失效
  mocks/        MSW worker/handlers/内存数据/测试 server
  pages/        仪表盘、四个业务模块页面与 404
  styles/       全局样式与主题 token
  types/        API 与业务实体类型
  utils/        格式化、CSV/XLSX、下载、主题工具
tests/          按 src 结构镜像组织，集中存放全部测试
public/
  mockServiceWorker.js  MSW 浏览器 Service Worker（由 msw init 生成）
```

## 质量与测试

- 测试覆盖公共工具、路由配置、主题、API 错误、MSW 查询与 CRUD、DataTable 交互、命令搜索、模拟上传，以及客户/项目/订单/用户页面关键流程。
- 覆盖率报告输出到 `coverage/`：`pnpm test:coverage`。
- 交付门禁：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

## 浏览器支持

Chrome、Edge、Firefox、Safari 当前及最近两个主要版本；不支持 IE。窄屏以 992px 为导航切换断点。

## 范围限制

- 不提供真实后端、登录、认证、授权、密码管理或权限系统。
- 不提供页面标签栏。
- 不引入第二套图标库、Tailwind 或 Storybook。
