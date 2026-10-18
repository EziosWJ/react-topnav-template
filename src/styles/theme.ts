import { theme as antdTheme, type ThemeConfig } from 'antd';
import { appConfig } from '../config/app.config';
import type { ThemeMode } from '../utils/theme';

export function createThemeConfig(mode: ThemeMode): ThemeConfig {
  const isDark = mode === 'dark';
  // The brand purple is too dark for text on the dark surfaces; use a lighter
  // link/selected colour while keeping the same hue in light mode.
  const linkColor = isDark ? '#b7afff' : appConfig.brandColor;
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: {},
    token: {
      colorPrimary: appConfig.brandColor,
      colorInfo: appConfig.brandColor,
      colorLink: linkColor,
      colorLinkHover: isDark ? '#d3ceff' : '#8b7cf6',
      colorLinkActive: isDark ? '#9d93ff' : '#4b44b8',
      borderRadius: 9,
      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      colorBgLayout: isDark ? '#0f1117' : '#f5f6fb',
      colorBgContainer: isDark ? '#171922' : '#ffffff',
      colorBorderSecondary: isDark ? '#262a36' : '#e9ebf2',
    },
    components: {
      Layout: {
        headerBg: isDark ? '#171922' : '#ffffff',
        bodyBg: isDark ? '#0f1117' : '#f5f6fb',
        footerBg: 'transparent',
      },
      Menu: {
        itemBorderRadius: 8,
        activeBarBorderWidth: 0,
        itemSelectedColor: linkColor,
        horizontalItemSelectedColor: linkColor,
      },
      Table: {
        headerBg: isDark ? '#1e2130' : '#f7f8fc',
        headerColor: isDark ? '#e6e8f0' : '#3b3f4d',
        rowHoverBg: isDark ? '#202433' : '#f6f5ff',
      },
      Card: { borderRadiusLG: 14 },
      Button: { borderRadius: 8 },
      Drawer: { paddingLG: 24 },
    },
  };
}
