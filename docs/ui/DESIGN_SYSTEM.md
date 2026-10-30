# Topnav Design System

本文件是 `react-topnav-template` 的视觉设计规范。它描述**当前实现**与后续 UI 改造共同遵循的语义 Token、组件规则和页面模式。

- 适用范围：本仓库（Topnav 布局）的全部页面、公共组件和主题。
- 权威来源：`AGENTS.md`、`README.md` 与已确认的产品约束。仓库当前没有 `docs/spec/0004-ui-and-accessibility.md` 或 ADR 目录，因此本文件不覆盖任何不存在的规范；若未来新增 SPEC/ADR，以正式文档为准。
- 技术边界：React 19 + Ant Design 6 + CSS Modules。不引入 Tailwind、styled-components、Less 或第二套图标库。
- 布局边界：保留顶部导航，不引入左侧 Sidebar；保留现有路由、API、MSW 数据与业务交互。

---

## 1. 单一事实源

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| 品牌名、品牌色、页脚 | `src/config/app.config.ts` | 品牌色只在此处维护 |
| 语义颜色、状态色、图表色、布局尺寸 | `src/styles/tokens.ts` | Ant Design、CSS Modules、图表共用 |
| Ant Design Theme Token | `src/styles/theme.ts` | 从 `tokens.ts` 映射，不重复写色值 |
| CSS 自定义属性 | `applyThemeVariables()` | 运行时写入 `--app-*`，首帧前在 `main.tsx` 调用一次 |
| 全局基础样式 | `src/styles/global.css` | 仅放重置、焦点、工具类和无组件归属的规则 |
| 组件级样式 | `*.module.css` | 只写本组件作用域，避免全局 `.ant-table-*` 副作用 |

数据流：

```text
app.config.ts (brand)
        │
        ▼
tokens.ts ──► createThemeConfig() ──► ConfigProvider (Ant Design)
    │
    ├──► applyThemeVariables() ──► <html style="--app-*"> ──► CSS Modules
    │
    └──► chartPalettes / kpiAccents / statusToneTokens ──► 图表与状态标签
```

---

## 2. 颜色

### 2.1 品牌与中性色

| 语义 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `brand` | `#635bdb` | `#635bdb` | 主按钮、品牌标识、选中态 |
| `brandStrong` | `#8b7cf6` | `#b7afff` | 品牌渐变末端、深色链接 |
| `link` | `#635bdb` | `#b7afff` | 链接、导航选中文字 |
| `linkHover` | `#8b7cf6` | `#d3ceff` | 链接悬停 |
| `linkActive` | `#4b44b8` | `#9d93ff` | 链接按下 |
| `bgLayout` | `#f4f5fa` | `#0f1117` | 页面底色 |
| `bgContainer` | `#ffffff` | `#171922` | Header、Card、Drawer |
| `bgElevated` | `#ffffff` | `#1c1f2c` | 浮层、弹窗 |
| `bgSubtle` | `#f7f8fc` | `#202433` | 表头、悬停、弱背景 |
| `text` | `#1f2330` | `#e6e8f0` | 主文字 |
| `textSecondary` | `#5c6273` | `#a8adbd` | 描述、辅助信息 |
| `textTertiary` | `#687080` | `#8b93a5` | 元信息、占位 |
| `border` | `#e2e5ee` | `#2a2e3d` | 控件边框 |
| `borderSecondary` | `#eceef4` | `#262a36` | 分隔线、卡片边框 |
| `focusRing` | `rgb(99 91 219 / 45%)` | `rgb(183 175 255 / 55%)` | 焦点外环 |

### 2.2 状态色

状态色由 `statusToneTokens` 统一维护，页面不得自行选色。

| Tone | Light 前景 / 背景 | Dark 前景 / 背景 | 语义示例 |
| --- | --- | --- | --- |
| `success` | `#15803d` / `#eaf7ef` | `#4ade80` / `#172f28` | 合作中、已完成、启用 |
| `processing` | `#5a52d5` / `#eeecfd` | `#b7afff` / `#262647` | 进行中、已支付、潜在客户 |
| `warning` | `#a15c00` / `#fdf3e3` | `#f0b35b` / `#3a2d21` | 待处理、已暂停 |
| `error` | `#b42318` / `#fdecec` | `#f28b82` / `#3a252c` | 已取消、危险操作 |
| `default` | `#4b5563` / `#f0f1f5` | `#a8adbd` / `#262933` | 草稿、停用、中性状态 |

所有前景/背景组合在对应主题下满足 WCAG 2.2 AA 正文对比度（≥ 4.5:1）。不要在页面中新增第 6 种状态色。

### 2.3 图表调色板

| 用途 | Light | Dark |
| --- | --- | --- |
| 分类色 1 | `#635bdb` | `#a79fff` |
| 分类色 2 | `#8b7cf6` | `#d3ceff` |
| 分类色 3 | `#2f9e8f` | `#4fc3b2` |
| 分类色 4 | `#d98a1f` | `#e8b05c` |
| 分类色 5 | `#d95c5c` | `#ef8a86` |
| 订单数量 | `#635bdb` | `#a79fff` |
| 订单金额 | `#2f9e8f` | `#4fc3b2` |
| 坐标轴文字 | `#5c6273` | `#a8adbd` |
| 网格线 | `#eceef5` | `#2a2e3d` |

图表必须使用 `chartPalettes[mode]`，不允许在页面内写十六进制颜色。金额使用千分位/货币格式；坐标轴可压缩为“万”，Tooltip 必须展示完整货币值。

### 2.4 颜色使用规则

- 品牌色只用于：主操作、链接、导航选中、焦点、品牌标识。
- 页面背景、卡片、浮层必须使用语义背景色，不直接使用纯白/纯黑。
- 危险操作默认中性文字，悬停/聚焦时转为错误色；只有确认弹窗的确认按钮使用 danger 实底。
- 不使用大面积渐变、玻璃拟态、重阴影或装饰性动效。品牌标识的轻渐变是唯一例外。

---

## 3. 字体与排版

| 层级 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| Display | 26–32 / 1.1 | 700 | Dashboard KPI 数值 |
| Page title | 20 / 1.3 | 650 | 页面标题 |
| Section title | 15 / 1.4 | 600 | Card 标题、详情区块 |
| Body | 14 / 1.55 | 400 | 正文、表格、表单 |
| Body strong | 14 / 1.5 | 500–600 | 表格主字段、强调 |
| Small | 13 / 1.5 | 400–500 | 描述、表格次要列、按钮 |
| Caption | 12 / 1.5 | 400 | 元信息、筛选摘要、帮助文本 |
| Micro | 11 / 1.4 | 500–600 | 分组标题、快捷键提示 |

- 字体栈：`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`。
- 数字使用 `font-variant-numeric: tabular-nums`（KPI、金额、日期列）。
- 标题不使用全大写英文；命令面板分组标题的 `text-transform: uppercase` 是唯一例外。
- 不用字号小于 11px 的可见文字。

---

## 4. 间距、圆角、阴影

### 4.1 间距刻度

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`。常用组合：

| 场景 | 间距 |
| --- | --- |
| 页面 Header 与内容 | 18px（`--app-page-gap`） |
| Card 内边距 | 20–24px；移动端 14–16px |
| 表单项垂直间距 | 18px |
| 按钮组 | 8px |
| 筛选控件 | 8px |
| 表格工具栏 | 12px |
| 页面区块 | 16–18px |

### 4.2 圆角

| Token | 值 | 用途 |
| --- | --- | --- |
| `radiusSm` | 6px | 小标签、分页项、键盘键帽 |
| `radiusMd` | 8px | 按钮、输入框、菜单项 |
| `radiusLg` | 12px | Card、下拉浮层、列表卡片 |
| `radiusXl` | 14px | Dashboard Card、详情 Card、表单 Card |
| Pill | 999px | StatusTag |

### 4.3 阴影

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `shadowCard` | `0 1px 2px rgb(24 26 40 / 5%)` | `0 1px 2px rgb(0 0 0 / 28%)` | 页面卡片 |
| `shadowRaised` | `0 8px 24px rgb(24 26 40 / 8%)` | `0 8px 24px rgb(0 0 0 / 38%)` | 悬停卡片 |
| `shadowPopover` | `0 12px 32px rgb(24 26 40 / 14%)` | `0 12px 32px rgb(0 0 0 / 48%)` | Dropdown、Popover、Drawer |

深色主题优先使用边框区分层级，阴影只作为辅助。

---

## 5. 页面容器与顶部导航

| 项目 | 桌面（≥ 992px） | 窄屏（< 992px） |
| --- | --- | --- |
| Header 高度 | 64px | 56px |
| Header 内边距 | 0 24px | 0 16px（≤575px：0 10px） |
| 内容最大宽度 | 1600px | 100% |
| 内容内边距 | 24px 32px 40px | 18px 18px 32px（≤575px：14px 12px 24px） |
| 导航 | 三段式：品牌 / 居中一级导航 / 工具 | 品牌 / 工具 + 汉堡打开 Drawer |
| Drawer 宽度 | — | 320px，最大 100vw |

Header 规则：

- `position: sticky; top: 0; z-index: 100`，底部 1px 分隔线。
- 品牌区可收缩，品牌名必须 `text-overflow: ellipsis`，不能挤压工具区。
- 一级导航使用 Ant Design Menu horizontal，超出宽度时自动收进“更多导航”下拉。
- 导航选中态：品牌色文字 + 2px 底部指示，不使用厚重背景。
- Dropdown 浮层：12px 圆角、`shadowPopover`、6px 内边距、36px 菜单行高。
- 窄屏 Drawer 菜单行高 ≥ 44px，搜索与主题入口保留在 Drawer 顶部。
- 搜索入口必须同时支持点击、`Ctrl+K` 和 macOS `⌘K`。
- 不提供应用内页面标签栏。

---

## 6. 组件规范

### 6.1 Button

- 高度 32px；小号 24–26px；触控区域在移动端建议 ≥ 44px。
- 圆角 8px。
- 主按钮：品牌色实底；一屏最多一个主按钮。
- 次按钮：默认边框；工具栏中的图标按钮使用 `type="text"` 或 `size="small"`。
- 危险操作：默认中性文字，悬停/聚焦变错误色；确认弹窗的确认按钮使用 danger。
- 加载态使用 Ant Design `loading`，禁止重复点击。

### 6.2 Input / Select / DatePicker

- 统一高度 32px；圆角 8px。
- 必须有可见标签或 `aria-label`；仅靠 placeholder 不足以作为唯一标签。
- 筛选控件宽度：Select 120–160px，客户选择 200px，日期范围 250px，关键词 260–360px。
- 窄屏筛选区变为两列网格，控件宽度 100%。

### 6.3 Card

- 圆角 12–14px；边框 `borderSecondary`；阴影 `shadowCard`。
- 标题 15px / 600；标题栏最小高度 52px（Dashboard）/ 48px（详情区块）。
- Card 内不再嵌套同尺寸 Card。

### 6.4 Table（DataTable）

- 表头高度 44px，背景 `tableHeaderBg`，文字 13px / 600。
- 行高：`middle` 约 48px，`small` 约 40px，`large` 约 56px。
- 表头分隔线使用 `borderSecondary`；行悬停使用 `bgSubtle`。
- 排序图标默认透明度 0.38，悬停 0.8，激活时品牌色且完全不透明。
- 操作列固定右侧，宽度 148px（3 个操作）或 196px（4 个操作）；常用操作在前，危险操作弱化。
- 必须显式提供稳定唯一的 `rowKey`，禁止数组索引。
- 工具栏：左侧页面级信息，右侧刷新、密度、列设置。
- 批量栏：品牌浅底、8px 圆角、显示选中数量与当前页/跨分页策略。
- 横向滚动时固定列必须有轻微阴影；窄屏分页器居中并允许换行。
- 组件级覆盖写在 `DataTable.module.css`，不得新增全局 `.ant-table-*` 规则。

### 6.5 Modal / Drawer

- Modal：14px 圆角，居中，确认弹窗必须有明确标题、影响说明和危险按钮。
- Drawer：560px（简单表单）/ 620px（复杂表单），最大 100vw。
- Drawer 结构：固定标题区、独立滚动内容区、固定底部操作区。
- 底部操作右对齐；窄屏两等分按钮。
- 提交中禁止关闭（closable / maskClosable 关闭），错误 Alert 位于表单顶部。
- 长表单保存失败时滚动到首个错误字段。

### 6.6 StatusTag

- 高度 22px，胶囊圆角，12px / 500。
- 左侧 6px 圆点 + 状态文字；颜色只来自 `statusToneTokens`。
- 未知状态回退为原值 + `default` tone，不崩溃、不隐藏。
- 深浅主题分别使用对应前景/背景值。

### 6.7 AsyncState

| 状态 | 组件 | 规则 |
| --- | --- | --- |
| 加载 | `LoadingState` | `role="status"` + `aria-live`；`variant` 选择 detail/list/cards，占位结构接近真实内容 |
| 错误 | `ErrorState` | 展示规范化后的安全文案 + 可选“重新加载”；不暴露堆栈 |
| 空数据 | `EmptyState` | 统一图标、标题、说明、可选操作；与错误状态明显区分 |
| 无权限 | 不适用 | 本模板不包含认证/授权；不伪造无权限页面或权限模块 |

- 页面必须覆盖加载、错误、空数据；列表页的表格错误态由 DataTable 渲染。
- 重试操作必须调用真实 refetch；网络错误不在公共层自动弹窗。

### 6.8 其他

- Tabs：本模板不使用页面标签栏；Segment 仅用于视图密度/统计范围切换。
- Tooltip：用于补充说明，不承载唯一关键信息。
- Popover：列设置面板必须有 `role="dialog"`、标题和键盘焦点进入。
- 分页：每页 10/20/50/100，默认 10；分页总数只在表格分页器展示一次。

---

## 7. 页面模式

### 7.1 Dashboard

- 结构：PageHeader（范围切换 + 刷新）→ KPI 卡片行 → 项目状态/订单数量/订单金额三张图表卡 → 趋势说明 → 最近订单。
- KPI：图标 + 指标名 + 数值 + 跳转入口；数值使用 tabular-nums；每张卡片只表达一个指标。
- 订单数量与金额**分开成两张图**：数量用柱状图，金额用折线图，各自 Y 轴与 Tooltip；不允许只在 Tooltip 中展示金额却在标题宣称同时展示。
- 图表数据必须来自 API 的 `orderCount` / `amount`，不推算、不伪造同比环比。
- 0 值：图表正常显示 0；全部为 0 时显示空状态。
- 图表主题随 `themeMode` 切换；坐标轴、网格、图例、Tooltip 使用统一调色板。

### 7.2 列表页

统一结构：

```text
PageHeader
  ├── 标题 + 描述 + 静态演示说明
  └── 右侧业务操作（新建 / 导入 / 导出）

Card
  ├── SearchFilterBar
  │     ├── 关键词 + 筛选 + 搜索 + 重置
  │     └── 已提交条件摘要（关键词 / 筛选数量 / 自定义排序）
  ├── DataTable
  │     ├── 工具栏：页面信息 + 刷新 + 密度 + 列设置
  │     ├── 批量栏（选中时）
  │     └── 表格 + 分页（唯一的总数展示位置）
```

- 同一条记录总数只出现一次：表格分页器。
- 搜索必须显式提交（点击或 Enter）；URL 只同步已提交条件。
- 重置恢复默认条件并重新查询。
- 危险操作不进入主操作区；行内危险操作默认中性样式。

### 7.3 表单页

- 结构：PageHeader（返回）→ 可选警告 → FormPage Card。
- FormPage 负责页面标题、表单容器、两列网格和吸底操作区。
- 字段默认两列；备注/长文本使用 `form-span-full`；≤767px 自动单列。
- 表单标签 500 字重；帮助文本/错误 12px；表单项间距 18px。
- 提交按钮使用动词（创建客户/保存修改），取消按钮在左/次位。

### 7.4 详情页

- PageHeader：标题 + 状态 Tag + 描述 + 返回/编辑/删除（危险操作在最后）。
- 区块使用 `DetailSection` + `DetailFields`，信息按业务语义分组。
- 关联列表使用 Ant Design Table，空状态提供下一步操作。
- 删除前必须确认，并说明关联数据影响。

---

## 8. 状态与交互

| 状态 | 规则 |
| --- | --- |
| Hover | 背景 `bgSubtle` 或边框品牌色；不做位移（KPI 卡片允许 1px 上浮） |
| Active | 品牌色加深；不改变布局尺寸 |
| Focus | 2px 品牌色外环，offset 2–3px；所有键盘可操作控件可见 |
| Disabled | Ant Design disabled token；保持文字可读，不使用 `opacity: 0` |
| Loading | 局部 loading；按钮 loading；骨架尺寸接近真实内容 |
| Empty | 明确标题 + 说明 + 可选操作 |
| Error | 安全文案 + 重试；与空状态视觉区分 |
| Unauthorized | 本模板无认证/授权，不实现；不要伪造 |

动效：只使用 150–200ms 的颜色/阴影/透明度过渡；尊重 `prefers-reduced-motion`。

---

## 9. 响应式断点

| 断点 | 关键变化 |
| --- | --- |
| ≥ 1600px | 内容最大宽度 1600px；Dashboard 三张图表同行 |
| 1200–1599px | 导航完整；搜索按钮隐藏文字标签（≤1199） |
| 992–1199px | 顶部导航保持横向；搜索仅图标 + 快捷键 |
| 768–991px | 隐藏横向导航，使用汉堡 + Drawer；内容内边距缩小 |
| 576–767px | PageHeader 纵向堆叠；表单单列；筛选两列网格 |
| ≤ 575px | Header 56px；隐藏快捷键提示；Card/Drawer 内边距 14–16px；分页居中 |

必须检查视口：`1920 / 1440 / 1280 / 1024 / 768 / 390px`。

---

## 10. 可访问性

- 正常正文对比度 ≥ 4.5:1；大字 ≥ 3:1；状态标签已按此校验。
- 所有交互控件可通过键盘操作，焦点可见。
- 语义化 HTML；页面标题使用 `h1`；表格使用真实 `<table>`。
- 图标按钮必须有 `aria-label`；装饰图标 `aria-hidden="true"`。
- 命令面板：`role="combobox"` + `listbox/option` + `aria-activedescendant`，支持 ↑↓/Home/End/Enter/Esc。
- 跳到主内容链接保留；`main` 可聚焦。
- 加载状态使用 `role="status"`；批量栏使用 `aria-live="polite"`。
- 生产错误页不展示堆栈和内部实现细节。
- 不使用仅靠颜色表达状态；StatusTag 同时提供文字。

---

## 11. 禁止项

- 不引入 Tailwind、styled-components、Less、Storybook 或第二套图标库。
- 不新增左侧 Sidebar 或页面标签栏。
- 不在页面中重复定义状态颜色、品牌色或图表色。
- 不通过全局 `.ant-table-*` 规则修改表格。
- 不为视觉效果伪造业务数据、同比/环比或统计指标。
- 不把“构建通过”当作视觉验收通过。
- 不修改 API、路由、权限（本模板无）、URL 状态契约来迁就视觉。

---

## 12. 验收方法

1. `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。
2. 启动 `pnpm dev`，在 Light/Dark 与 6 个目标视口下检查：
   - 无横向溢出、遮挡、裁切；
   - Header 三段式不重叠，移动端 Drawer 可用；
   - 表格固定列、横向滚动、分页、选择正常；
   - Drawer/Popover/Dropdown 不超出视口，底部操作可见；
   - 图表坐标轴、图例、Tooltip 两种主题可读；
   - 键盘焦点与主要交互可用。
3. 视觉验收记录见 `docs/ui/VISUAL_QA.md`。
