import { Platform } from 'react-native';

const tintColorLight = '#1a1a2e';
const tintColorDark = '#e0e0e0';

export const Colors = {
  light: {
    text: '#1a1a2e',
    textSecondary: '#6b7280',
    background: '#fafafa',
    card: '#ffffff',
    tint: tintColorLight,
    icon: '#9ca3af',
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
    border: '#f0f0f0',
    accent: '#6366f1',
    accentLight: '#eef2ff',
    success: '#10b981',
    successLight: '#d1fae5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    heatmap0: '#f3f4f6',
    heatmap1: '#c7d2fe',
    heatmap2: '#a5b4fc',
    heatmap3: '#818cf8',
    heatmap4: '#6366f1',
  },
  dark: {
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    background: '#0f0f14',
    card: '#1a1a24',
    tint: tintColorDark,
    icon: '#6b7280',
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,
    border: '#2a2a36',
    accent: '#818cf8',
    accentLight: '#1e1b4b',
    success: '#34d399',
    successLight: '#064e3b',
    danger: '#f87171',
    dangerLight: '#7f1d1d',
    heatmap0: '#1f2937',
    heatmap1: '#312e81',
    heatmap2: '#3730a3',
    heatmap3: '#4f46e5',
    heatmap4: '#6366f1',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
