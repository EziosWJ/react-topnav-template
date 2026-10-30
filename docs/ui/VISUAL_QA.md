# Topnav Visual QA Record

本文件记录 Issue #21（UI-09）的全站视觉与功能回归结果，对应总控 Issue #22。

## 1. 环境与方法

| 项目 | 内容 |
| --- | --- |
| 日期 | 2026-10-31 |
| 地址 | `http://127.0.0.1:5175/`（`pnpm dev`，MSW 启用） |
| 浏览器 | Google Chrome for Testing 153.0.8010.12（Playwright Chromium，headless） |
| 自动化 | Playwright 1.63（仅用于本地验收，未加入项目依赖） |
| 主题 | Light / Dark，通过 `localStorage['app-theme']` 预置 |
| 视口 | 1920×1080、1440×900、1280×800、1024×768、768×900、390×844 |
| 页面 | Dashboard、客户列表、客户详情、客户编辑、移动端 Drawer、命令面板、快速新建 Drawer、批量选择 |

每张页面截图均等待真实 MSW 数据出现后再截取，并使用 `page.screenshot({ fullPage: true })` 保留完整页面。原始测量结果见 `docs/ui/screenshots/qa-results.json`。

## 2. 视口与主题矩阵

| 视口 | 主题 | Dashboard 横向溢出 | 客户列表横向溢出 | 表格内部滚动 | Header 重叠 |
| --- | --- | --- | --- | --- | --- |
| 1920 | Light | 0 px | 0 px | 无（1494 / 1494） | 无 |
| 1440 | Light | 0 px | 0 px | 无（1334 / 1334） | 无 |
| 1280 | Light | 0 px | 0 px | 无（1174 / 1174） | 无 |
| 1024 | Dark | 0 px | 0 px | 客户表 918 / 1040 | 无 |
| 768 | Light | 0 px | 0 px | 客户表 690 / 1040 | 无 |
| 390 | Dark | 0 px | 0 px | 客户表 332 / 1040；Dashboard 332 / 680 | 无 |

补充检查：

- 390px 客户列表的筛选表单高度为 112px（修复前因 `flex-basis` 在纵向 flex 中变成高度，曾达到 560px）。
- 390px Dashboard 的卡片宽度为 366px，最近订单表在卡片内部横向滚动；修复前曾把整页撑到 734px。
- 1024 / 768 / 390px 下横向导航隐藏，汉堡按钮可用；Header 品牌、工具区不重叠。
- 所有页面 `document.documentElement.scrollWidth === window.innerWidth`。

截图：

- `dashboard-1920-light.png`、`dashboard-1440-light.png`、`dashboard-1280-light.png`、`dashboard-1024-dark.png`、`dashboard-768-light.png`、`dashboard-390-dark.png`
- `customers-1920-light.png`、`customers-1440-light.png`、`customers-1280-light.png`、`customers-1024-dark.png`、`customers-768-light.png`、`customers-390-dark.png`

## 3. 关键页面与组件

### 3.1 Dashboard

| 检查项 | 结果 |
| --- | --- |
| KPI 卡片层级 | 图标 + 指标名 + 数值 + 跳转入口，四卡等高 |
| 订单数量表达 | 独立柱状图，Y 轴为订单数，Tooltip 仅显示数量（截图实测 0–1） |
| 订单金额表达 | 独立折线图，Y 轴可压缩为“万”，Tooltip 显示完整货币值 |
| 图表与标题一致 | 数量/金额分别成图，标题不再声称单图展示双指标 |
| 0 值 / 无数据 | 数量与金额分别判断；全部为 0 时各自显示空状态 |
| 深浅主题 | 饼图、柱图、折线、坐标轴、网格、图例可读 |
| 时间范围 / 刷新 / 跳转 | 保留并通过现有单元测试 |
| 近 90 天 / 近 12 个月 | 切换后三张图表均渲染，坐标轴与日期标签自动抽稀，页面无横向溢出；12 个月金额轴可压缩为“万” |

截图：`dashboard-1280-dark.png`、`dashboard-390-dark.png`、`dashboard-90d-1280-light.png`、`dashboard-12m-1280-light.png`。

### 3.2 列表页与表格

| 检查项 | 结果 |
| --- | --- |
| 信息层级 | PageHeader（标题/描述/静态说明 + 主操作）→ 筛选区 → 表格 |
| 总数唯一 | 仅在表格分页器显示“共 N 条”；筛选摘要只显示关键词/筛选数量/自定义排序 |
| 筛选响应式 | 390px 两列网格，表单高度 112px；按钮不挤压、不溢出 |
| 工具栏 | 刷新 + 三档密度 + 列设置；选中时批量栏高 43px |
| 排序 | 默认弱化，激活时品牌色；排序不会误触分页 |
| 选择 | 当前页/跨分页切换、批量栏、取消选择正常 |
| 固定操作列 | 1024/768/390px 均可用，表格内部横向滚动 |
| 危险操作 | 行内“删除”默认中性文字，悬停/聚焦变错误色 |

截图：`customers-1280-light.png`、`customers-1280-dark.png`、`customers-selection-1280-light.png`、`customers-390-dark.png`。

### 3.3 表单

| 检查项 | 结果 |
| --- | --- |
| 独立表单页 | PageHeader 由 FormPage 统一渲染；两列网格；“备注”跨两列；窄屏单列 |
| 快速新建 Drawer | 宽度 560px（≤100vw） |
| Drawer 底部操作 | footer `bottom = 800`，与视口底部对齐，未被遮挡 |
| Drawer 内容滚动 | body `clientHeight = 672`，`scrollHeight = 732`，独立滚动 |
| 校验/提交 | 错误 Alert、字段错误绑定、`scrollToFirstError`、提交中关闭限制保留 |
| 移动端 | 390px 下单列字段、底部按钮两等分 |

截图：`customer-form-1280-light.png`、`form-drawer-1280-light.png`、`customer-detail-1280-dark.png`。

### 3.4 浮层与移动导航

| 检查项 | 结果 |
| --- | --- |
| 移动端 Drawer | 宽度 320px，左对齐，高度 844px，菜单行高 ≥ 44px |
| 命令面板 | `Ctrl+K` 打开；输入框自动聚焦；Esc 关闭；按钮 Enter 打开 |
| 命令面板尺寸 | 1280×800 下 left 350 / right 930 / top 123 / bottom 677，未超出视口 |
| 桌面下拉菜单 | 默认不再自动展开；当前组仅在移动端 inline 菜单中展开 |
| 主题切换 | 点击后 `data-theme=dark`，`localStorage=dark`，`--app-bg-layout=#0f1117` |

截图：`mobile-drawer-390-dark.png`、`command-palette-1280-light.png`。

## 4. 可访问性检查

### 4.1 状态色对比度

通过浏览器计算 `StatusTag` 的实际前景/背景色，WCAG 对比度结果：

| 主题 | 观测到的最低对比度 | 样本 |
| --- | --- | --- |
| Light | 4.55:1 | 合作中、潜在客户、进行中、待处理等 |
| Dark | 6.48:1 | 草稿等中性状态；其余 7.17–8.18:1 |

均满足 WCAG 2.2 AA 正文要求（≥ 4.5:1）。

### 4.2 键盘与焦点

| 检查项 | 结果 |
| --- | --- |
| `Ctrl+K` 打开命令面板 | 通过 |
| 命令面板输入框自动聚焦 | `aria-label = 搜索页面或导航入口` |
| `Esc` 关闭命令面板 | 通过 |
| 搜索按钮聚焦后 Enter 打开 | 通过 |
| 表单控件焦点环 | 过渡结束后为品牌色 2px 实线，边框同步变品牌色 |
| 按钮焦点环 | Ant Design 可见焦点环，键盘 Tab 可依次到达 |
| 主题切换按钮 | 可键盘触发并持久化 |
| 跳到主内容 | 保留 `#main-content` skip link |

## 5. 工程门禁

```text
pnpm lint        ✅ 通过
pnpm typecheck   ✅ 通过
pnpm test        ✅ 25 个测试文件 / 112 个用例通过
pnpm build       ✅ 通过
```

> 覆盖率报告通过 `pnpm test:coverage` 生成；本轮未设置新的覆盖率硬门槛。

## 6. 遗留问题与说明

1. **本模板没有认证/授权系统**，因此没有“无权限”页面入口。规范中明确记录为不适用，未伪造权限模块；未来引入权限时应在路由层增加独立的 Forbidden 状态。
2. **1024px 以下表格横向滚动是预期行为**：固定操作列保持可见，其余列在表格内部滚动，不造成页面级横向溢出。
3. **图表为 Canvas 渲染**：屏幕阅读器通过外层 `role="img"` + `aria-label` 获得图表主题与统计范围；具体数值可在 Tooltip 和表格中获取。
4. **截图字体**依赖验收机器的中文字体；本轮截图中文渲染正常。若在其他环境复查，字体外观可能略有差异，不影响布局结论。
5. 未发现阻断级布局、功能或可访问性问题。
6. **已知规范差距（非本轮引入）**：SPEC-0003 要求筛选控件先作为草稿、与关键词一次性提交；当前四个列表仍沿用筛选变更立即写入 URL 的既有实现。该差距已在 `docs/acceptance.md` F 节记录，本轮 UI 改造未改变筛选提交行为。
