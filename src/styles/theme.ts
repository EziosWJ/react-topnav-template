import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { ThemeMode } from '../utils/theme';
import { themeTokens } from './tokens';

export function createThemeConfig(mode: ThemeMode): ThemeConfig {
  const tokens = themeTokens[mode];
  const isDark = mode === 'dark';

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: {},
    token: {
      colorPrimary: tokens.brand,
      colorInfo: tokens.brand,
      colorLink: tokens.link,
      colorLinkHover: tokens.linkHover,
      colorLinkActive: tokens.linkActive,
      colorText: tokens.text,
      colorTextSecondary: tokens.textSecondary,
      colorTextTertiary: tokens.textTertiary,
      colorBgLayout: tokens.bgLayout,
      colorBgContainer: tokens.bgContainer,
      colorBgElevated: tokens.bgElevated,
      colorBorder: tokens.border,
      colorBorderSecondary: tokens.borderSecondary,
      borderRadius: tokens.radiusMd,
      borderRadiusSM: tokens.radiusSm,
      borderRadiusLG: tokens.radiusLg,
      controlHeight: tokens.controlHeight,
      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: 14,
      boxShadow: tokens.shadowRaised,
      boxShadowSecondary: tokens.shadowPopover,
      boxShadowTertiary: tokens.shadowCard,
    },
    components: {
      Layout: {
        headerBg: tokens.bgContainer,
        bodyBg: tokens.bgLayout,
        footerBg: 'transparent',
      },
      Menu: {
        itemBorderRadius: tokens.radiusMd,
        activeBarBorderWidth: 0,
        itemSelectedColor: tokens.link,
        horizontalItemSelectedColor: tokens.link,
        itemHoverColor: tokens.linkHover,
        horizontalItemHoverColor: tokens.linkHover,
      },
      Table: {
        headerBg: tokens.tableHeaderBg,
        headerColor: tokens.textSecondary,
        headerSplitColor: 'transparent',
        rowHoverBg: tokens.bgSubtle,
        cellPaddingBlock: 12,
        cellPaddingInline: 14,
        headerBorderRadius: tokens.radiusSm,
        borderColor: tokens.borderSecondary,
      },
      Card: { borderRadiusLG: tokens.radiusXl },
      Button: { borderRadius: tokens.radiusMd, controlHeight: tokens.controlHeight },
      Input: { controlHeight: tokens.controlHeight },
      Select: { controlHeight: tokens.controlHeight },
      DatePicker: { controlHeight: tokens.controlHeight },
      Tag: { borderRadiusSM: tokens.radiusSm },
      Drawer: { paddingLG: 24 },
      Dropdown: { borderRadiusLG: tokens.radiusLg },
      Tooltip: { borderRadius: tokens.radiusMd },
    },
  };
}
