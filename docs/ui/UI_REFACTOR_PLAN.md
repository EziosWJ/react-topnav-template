# Topnav UI Refactor Plan

本计划对应总控 Issue #22 与子 Issue #13–#21，记录改造前的现状问题、优先级、文件映射、实施顺序和验收方法。视觉规范见 `docs/ui/DESIGN_SYSTEM.md`。

---

## 1. 改造前现状审查

审查范围：`src/styles/theme.ts`、`src/styles/global.css`、全部 CSS Modules、`AppLayout`、`PageHeader`、`SearchFilterBar`、`DataTable`、`FormDrawer`、`FormPage`、`AsyncState`、`StatusTag`、Dashboard 与四个业务列表/表单/详情页。

发现的问题：

| 编号 | 问题 | 影响 | 优先级 |
| --- | --- | --- | --- |
| P-01 | 品牌色、状态色、图表色分散在 `theme.ts`、`StatusTag`、`DashboardPage`、`AppLayout.module.css` | 改色需要多处同步，深浅主题容易漂移 | P0 |
| P-02 | 全局 `global.css` 直接覆盖 `.ant-table-*`、`.ant-table-tbody .table-actions` | 跨页面副作用，任何表格调整都会影响详情页/仪表盘 | P0 |
| P-03 | Dashboard 标题为“订单数量与金额趋势”，但柱状图只画 `orderCount`，金额仅在 Tooltip | 图形与文案不一致，用户无法从图形比较金额趋势 | P0 |
| P-04 | 列表页在 PageHeader、筛选摘要、分页器重复展示总数 | 信息冗余，违反单一总数表达 | P1 |
| P-05 | 列表页业务操作（新建/导入/导出）位于筛选区内部，标题右侧为空 | 标题与主操作层级不清，窄屏按钮拥挤 | P1 |
| P-06 | 表格工具栏缺少刷新入口；排序图标常显；操作列危险按钮与常用操作同权重 | 表格级操作分散，危险操作过于突出 | P1 |
| P-07 | FormDrawer 底部操作没有显式的固定/分隔样式；FormPage 标题由每个页面自行拼装 | 表单结构重复，长表单底部操作可能被遮挡 | P1 |
| P-08 | FormPage 没有统一标题；四个表单页重复 `PageHeader + FormPage` 结构 | 后续改标题/返回按钮要改四处 | P2 |
| P-09 | `StatusTag` 色调与 `AsyncState` 颜色硬编码；正常/空/错误/加载缺少结构说明 | 状态语义不统一，深色对比度不可控 | P1 |
| P-10 | `LoadingState` 只有一种骨架，Dashboard 与列表/详情使用相同占位 | 加载布局跳动，无法表达页面结构 | P2 |
| P-11 | 顶部导航没有明确的溢出收纳策略；品牌名没有可靠的省略规则 | 菜单增多或品牌名较长时可能挤压工具区 | P1 |
| P-12 | `global.css` 中部分颜色使用 `--ant-*` 回退，组件 CSS 使用旧回退值 | 同一语义存在多套近似值 | P2 |

**保留项（不得改变）**

- 顶部导航布局、路由表派生菜单/面包屑/命令搜索的实现方式。
- URL 列表状态（已提交关键词、筛选、排序、分页）与显式提交行为。
- DataTable 的 `rowKey`、当前页/跨分页选择、三档密度、列显隐、排序、分页回调语义。
- 表单校验、提交、服务端字段错误绑定、提交中关闭限制。
- API 契约、MSW 数据、导出、模拟上传和所有业务交互。
- Light/Dark 主题切换行为与 `localStorage` key `app-theme`。

---

## 2. 优先级与任务映射

### P0 — 设计系统基础与阻断一致性问题

| Issue | 交付 | 文件 | 状态 |
| --- | --- | --- | --- |
| #13 UI-01 | 设计规范 + 改造计划 | `docs/ui/DESIGN_SYSTEM.md`、`docs/ui/UI_REFACTOR_PLAN.md` | 完成 |
| #14 UI-02 | 语义 Token、AntD 映射、图表调色板、CSS 变量 | `src/styles/tokens.ts`、`src/styles/theme.ts`、`src/styles/global.css`、`src/app/AppProviders.tsx`、`src/main.tsx` | 完成 |
| #16 UI-04 | Dashboard 数量/金额分离表达 + 图表主题 | `src/pages/DashboardPage.tsx`、`src/pages/DashboardPage.module.css`、`src/components/templates/DashboardCard.module.css` | 完成 |

### P1 — 布局、列表、表格、表单与状态反馈

| Issue | 交付 | 主要文件 | 状态 |
| --- | --- | --- | --- |
| #15 UI-03 | Header 三段式、溢出收纳、Drawer、浮层 | `src/layouts/AppLayout.tsx`、`AppLayout.module.css` | 完成 |
| #17 UI-05 | 列表页标题/筛选/操作分层，去重总数 | `PageHeader`、`SearchFilterBar`、`ListPageTemplate`、四个列表页 | 完成 |
| #18 UI-06 | 表格密度/排序/选择/操作列视觉 | `DataTable.tsx`、`DataTable.module.css`、四个列表页列定义 | 完成 |
| #19 UI-07 | FormDrawer 吸底操作、FormPage 统一标题与网格 | `FormDrawer`、`FormPage`、四个表单页 | 完成 |
| #20 UI-08 | StatusTag、Empty/Loading/Error 统一 | `StatusTag`、`AsyncState`、`DashboardCard`、业务页调用 | 完成 |

### P2 — 收尾与一致性清理

| 项 | 内容 | 状态 |
| --- | --- | --- |
| 详情区块样式 | `DetailSection` / `DetailFields` 使用统一卡片 Token | 完成 |
| 模拟上传样式 | `MockUpload` 使用语义 Token | 完成 |
| 命令面板浮层 | 选中态、焦点环、分组标题使用 Token | 完成 |
| 全局工具类 | 仅保留 `.table-*`、`.page-meta-note` 等无组件归属的规则 | 完成 |
| 视觉验收记录 | `docs/ui/VISUAL_QA.md` + 截图 | 完成 |

---

## 3. 关键改造说明

### 3.1 Token 收敛（#14）

- `tokens.ts` 是唯一语义色板：`themeTokens`、`statusToneTokens`、`chartPalettes`、`kpiAccents`。
- `createThemeConfig(mode)` 从 Token 生成 Ant Design Theme，不再写死颜色。
- `applyThemeVariables(mode)` 把 Token 写成 `--app-*` CSS 变量，CSS Modules 直接消费。
- `main.tsx` 在首帧前调用一次，避免主题变量闪烁；`PreferencesProvider` 在切换时再次调用。
- 图表使用 `chartPalettes[themeMode]`；StatusTag 使用 `statusToneTokens`。
- 移除了 `global.css` 中所有 `.ant-table-*` 全局覆盖，迁移到 `DataTable.module.css` 的 `.tableRegion` 作用域。

### 3.2 顶部导航（#15）

- Header 改为 `minmax(150px,1fr) / minmax(0,2fr) / minmax(150px,1fr)` 三段式，品牌名可省略，工具区不收缩。
- 横向 Menu 使用 Ant Design 自带溢出收纳，`overflowedIndicator` 为“更多导航”图标；菜单项多时自动折叠。
- 导航选中态为品牌色文字 + 2px 底部指示；下拉浮层统一圆角、阴影、行高。
- 移动端 Drawer 宽度 320px，菜单行高 ≥ 44px，保留品牌、搜索、主题入口。
- 未改变 `getNavigation()` / `matchRoute()` / active route 判断。

### 3.3 列表页（#17）

- 页面结构统一为：PageHeader（标题/描述/静态演示说明 + 右侧业务操作）→ Card（筛选 + 表格）。
- 总数只保留在表格分页器；筛选摘要只表达已提交条件（关键词、筛选数量、自定义排序）。
- 业务操作从筛选区移到 PageHeader 右侧；筛选区只保留查询、筛选、搜索、重置。
- 四个页面使用同一套间距、控件高度、响应式换行和空/错/加载状态。
- 保留显式提交、Enter 提交、重置和 URL 同步契约。

### 3.4 DataTable（#18）

- 表头高度、文字字重、背景、分隔线、行高、Hover、排序图标透明度统一。
- 工具栏新增“刷新表格”按钮（`onRefresh` / `refreshing`），页面传入 refetch。
- 操作列常用操作在前；危险操作默认中性文字 + 左侧分隔线，悬停/聚焦变错误色。
- 批量栏、密度切换、列设置、分页器统一 Token。
- 保留所有选择、分页、排序、列显隐与回调语义；未新增数组索引 rowKey。

### 3.5 表单（#19）

- `FormPage` 新增 `header` 与 `notice`，四个创建/编辑页不再各自拼装 PageHeader。
- FormPage 两列网格、18px 表单项间距、吸底操作区、错误 Alert、`scrollToFirstError`。
- FormDrawer 固定标题区、独立滚动内容区、吸底底部操作；简单表单 560px，复杂表单 620px，最大 100vw。
- 窄屏按钮两等分，表单单列；保留提交中关闭限制、错误绑定和数据回填。

### 3.6 状态反馈（#20）

- StatusTag 使用 `statusToneTokens`，新增深色前景/背景；圆点使用 `currentColor`。
- `LoadingState` 支持 `detail` / `list` / `cards` 三种骨架结构。
- Empty/Error 统一间距、圆角、重试入口；Dashboard 错误与局部刷新错误区分。
- 本模板没有认证/授权系统，因此不实现“无权限”页面；规范中明确记录为不适用，避免伪造模块。

### 3.7 Dashboard（#16）

- KPI 卡片：图标 + 指标名 + 数值 + 跳转入口，统一高度与色彩，数值 tabular-nums。
- 订单数量与金额拆成两张图：
  - 数量：`Column`，Y 轴为订单数，Tooltip 只展示数量；
  - 金额：`Line`，Y 轴为金额（可压缩为“万”），Tooltip 展示完整货币值。
- 两图共用 `label` 轴、统计范围和真实 `orderCount` / `amount`，不再出现“标题声称双指标、图形只画一个”的误导。
- 项目状态饼图、数量柱图、金额折线图使用同一图表调色板与深浅主题。
- 0 值与部分数据：分别判断 `hasCountData` / `hasAmountData`，单个指标全 0 时该卡片显示空状态，不影响另一张图。
- 保留时间范围切换、刷新、错误重试、KPI 跳转与最近订单表格。

---

## 4. 实施顺序与依赖

```text
#13 设计规范
  └── #14 Token / Theme
        ├── #15 AppLayout
        ├── #16 Dashboard
        ├── #17 列表页
        │     └── #18 DataTable
        ├── #19 表单
        └── #20 状态反馈
                └── #21 全站验收
```

实际执行按上述顺序串行完成，避免多个 Agent 同时修改公共组件。所有子任务共用同一份 `DESIGN_SYSTEM.md`，不单独发明颜色或间距。

---

## 5. 验收标准

### 功能与契约

- [x] 路由、菜单、面包屑、命令搜索行为不变。
- [x] URL 列表状态、显式提交、重置、排序、分页行为不变。
- [x] DataTable 选择（当前页/跨分页）、密度、列显隐、排序、分页无回归。
- [x] 表单校验、提交、服务端字段错误、提交中关闭限制无回归。
- [x] 导出、模拟上传、CRUD、关联引用 409 提示无回归。
- [x] API 契约、MSW 数据、时间范围切换、KPI 跳转无回归。

### 视觉与响应式

- [x] Light/Dark 下文字、边框、背景、图表、浮层可读。
- [x] 1920 / 1440 / 1280 / 1024 / 768 / 390px 无阻断级布局问题。
- [x] Header 品牌/导航/工具不重叠，菜单可溢出收纳。
- [x] 移动端 Drawer、命令面板、Dropdown、Popover 不超出视口。
- [x] 表格窄屏可横向滚动，固定操作列可用。
- [x] Drawer 底部操作固定可见，内容独立滚动。
- [x] 空、加载、错误状态视觉可区分；无权限状态不适用并有说明。

### 可访问性

- [x] 状态色对比度满足 WCAG 2.2 AA（正文 ≥ 4.5:1）。
- [x] 图标按钮有 `aria-label`；焦点可见；键盘可完成搜索、导航、表格设置。
- [x] 命令面板组合键、方向键、Enter、Esc 正常。

### 工程门禁

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

全部通过；视觉验收记录见 `docs/ui/VISUAL_QA.md`。

---

## 6. 遗留与后续建议

1. 本模板没有认证/授权，因此“无权限”状态没有实际入口；未来引入权限时，应在路由层增加 `ForbiddenState`，而不是把空数据伪装成无权限。
2. 四个列表页仍保留相似的页面编排代码。当前重复可控且测试覆盖充分；若新增第五个业务模块，再考虑抽取 `useListController`。
3. 图表库的 `theme: 'classic' | 'classicDark'` 与 Token 调色板配合使用；升级 Ant Design Charts 时需要重新检查轴/图例/Tooltip 配置类型。
4. 品牌色仍以 `app.config.ts` 为唯一来源，切换品牌色后需在目标视口复查对比度（尤其是深色链接色）。
