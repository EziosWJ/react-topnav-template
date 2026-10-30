import { appConfig } from '../config/app.config';

export type ThemeModeName = 'light' | 'dark';
export type StatusToneName = 'success' | 'processing' | 'warning' | 'error' | 'default';

export interface TonePair {
  fg: string;
  bg: string;
}

export interface ThemeToken {
  brand: string;
  brandStrong: string;
  bgLayout: string;
  bgContainer: string;
  bgElevated: string;
  bgSubtle: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSecondary: string;
  link: string;
  linkHover: string;
  linkActive: string;
  focusRing: string;
  tableHeaderBg: string;
  shadowCard: string;
  shadowRaised: string;
  shadowPopover: string;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;
  controlHeight: number;
}

/**
 * Single source of truth for the semantic palette. Ant Design tokens,
 * CSS Module variables and chart palettes all read from this module so light
 * and dark modes cannot drift apart.
 */
export const themeTokens: Record<ThemeModeName, ThemeToken> = {
  light: {
    brand: appConfig.brandColor,
    brandStrong: '#8b7cf6',
    bgLayout: '#f4f5fa',
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    bgSubtle: '#f7f8fc',
    text: '#1f2330',
    textSecondary: '#5c6273',
    textTertiary: '#687080',
    border: '#e2e5ee',
    borderSecondary: '#eceef4',
    link: '#635bdb',
    linkHover: '#8b7cf6',
    linkActive: '#4b44b8',
    focusRing: 'rgb(99 91 219 / 45%)',
    tableHeaderBg: '#f7f8fc',
    shadowCard: '0 1px 2px rgb(24 26 40 / 5%)',
    shadowRaised: '0 8px 24px rgb(24 26 40 / 8%)',
    shadowPopover: '0 12px 32px rgb(24 26 40 / 14%)',
    radiusSm: 6,
    radiusMd: 8,
    radiusLg: 12,
    radiusXl: 14,
    controlHeight: 32,
  },
  dark: {
    brand: appConfig.brandColor,
    brandStrong: '#b7afff',
    bgLayout: '#0f1117',
    bgContainer: '#171922',
    bgElevated: '#1c1f2c',
    bgSubtle: '#202433',
    text: '#e6e8f0',
    textSecondary: '#a8adbd',
    textTertiary: '#8b93a5',
    border: '#2a2e3d',
    borderSecondary: '#262a36',
    link: '#b7afff',
    linkHover: '#d3ceff',
    linkActive: '#9d93ff',
    focusRing: 'rgb(183 175 255 / 55%)',
    tableHeaderBg: '#1c1f2c',
    shadowCard: '0 1px 2px rgb(0 0 0 / 28%)',
    shadowRaised: '0 8px 24px rgb(0 0 0 / 38%)',
    shadowPopover: '0 12px 32px rgb(0 0 0 / 48%)',
    radiusSm: 6,
    radiusMd: 8,
    radiusLg: 12,
    radiusXl: 14,
    controlHeight: 32,
  },
};

/** Status tones are theme-aware and intentionally not chosen per page. */
export const statusToneTokens: Record<StatusToneName, Record<ThemeModeName, TonePair>> = {
  success: {
    light: { fg: '#15803d', bg: '#eaf7ef' },
    dark: { fg: '#4ade80', bg: '#172f28' },
  },
  processing: {
    light: { fg: '#5a52d5', bg: '#eeecfd' },
    dark: { fg: '#b7afff', bg: '#262647' },
  },
  warning: {
    light: { fg: '#a15c00', bg: '#fdf3e3' },
    dark: { fg: '#f0b35b', bg: '#3a2d21' },
  },
  error: {
    light: { fg: '#b42318', bg: '#fdecec' },
    dark: { fg: '#f28b82', bg: '#3a252c' },
  },
  default: {
    light: { fg: '#4b5563', bg: '#f0f1f5' },
    dark: { fg: '#a8adbd', bg: '#262933' },
  },
};

export interface ChartPalette {
  /** Categorical colours for status and distribution charts. */
  categories: string[];
  count: string;
  amount: string;
  axis: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
}

export const chartPalettes: Record<ThemeModeName, ChartPalette> = {
  light: {
    categories: ['#635bdb', '#8b7cf6', '#2f9e8f', '#d98a1f', '#d95c5c'],
    count: '#635bdb',
    amount: '#2f9e8f',
    axis: '#5c6273',
    grid: '#eceef5',
    tooltipBackground: '#ffffff',
    tooltipBorder: '#e2e5ee',
  },
  dark: {
    categories: ['#a79fff', '#d3ceff', '#4fc3b2', '#e8b05c', '#ef8a86'],
    count: '#a79fff',
    amount: '#4fc3b2',
    axis: '#a8adbd',
    grid: '#2a2e3d',
    tooltipBackground: '#1c1f2c',
    tooltipBorder: '#2a2e3d',
  },
};

/** KPI accent hues; each KPI keeps a stable semantic colour in both themes. */
export const kpiAccents: Record<'customers' | 'projects' | 'orders' | 'users', Record<ThemeModeName, string>> = {
  customers: { light: '#635bdb', dark: '#a79fff' },
  projects: { light: '#2f9e8f', dark: '#4fc3b2' },
  orders: { light: '#a15c00', dark: '#f0b35b' },
  users: { light: '#3f7cc7', dark: '#7db2ee' },
};

export const layoutTokens = {
  headerHeightDesktop: 64,
  headerHeightMobile: 56,
  contentMaxWidth: 1600,
  pageGap: 18,
  drawerWidthNarrow: 560,
  drawerWidthWide: 620,
} as const;

/**
 * Publishes the semantic palette as CSS custom properties on <html>.
 * CSS Modules consume `--app-*`; the Ant Design theme consumes the same
 * values through `createThemeConfig`, keeping one visual source of truth.
 */
export function applyThemeVariables(mode: ThemeModeName): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  const tokens = themeTokens[mode];
  const palette = chartPalettes[mode];
  const variables: Record<string, string> = {
    '--app-brand': tokens.brand,
    '--app-brand-strong': tokens.brandStrong,
    '--app-bg-layout': tokens.bgLayout,
    '--app-bg-container': tokens.bgContainer,
    '--app-bg-elevated': tokens.bgElevated,
    '--app-bg-subtle': tokens.bgSubtle,
    '--app-text': tokens.text,
    '--app-text-secondary': tokens.textSecondary,
    '--app-text-tertiary': tokens.textTertiary,
    '--app-border': tokens.border,
    '--app-border-secondary': tokens.borderSecondary,
    '--app-link': tokens.link,
    '--app-link-hover': tokens.linkHover,
    '--app-link-active': tokens.linkActive,
    '--app-focus-ring': tokens.focusRing,
    '--app-shadow-card': tokens.shadowCard,
    '--app-shadow-raised': tokens.shadowRaised,
    '--app-shadow-popover': tokens.shadowPopover,
    '--app-radius-sm': `${tokens.radiusSm}px`,
    '--app-radius-md': `${tokens.radiusMd}px`,
    '--app-radius-lg': `${tokens.radiusLg}px`,
    '--app-radius-xl': `${tokens.radiusXl}px`,
    '--app-control-height': `${tokens.controlHeight}px`,
    '--app-header-height': `${layoutTokens.headerHeightDesktop}px`,
    '--app-header-height-mobile': `${layoutTokens.headerHeightMobile}px`,
    '--app-content-max-width': `${layoutTokens.contentMaxWidth}px`,
    '--app-page-gap': `${layoutTokens.pageGap}px`,
    '--app-chart-axis': palette.axis,
    '--app-chart-grid': palette.grid,
  };

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}
