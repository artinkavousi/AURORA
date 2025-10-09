/**
 * PANEL/theme.ts - Enhanced theme system for dashboard
 */

export interface DashboardTheme {
  // Accent colors
  accent: string; // HEX color
  
  // Background
  backgroundHue: number; // 0-360
  backgroundSaturation: number; // 0-1
  backgroundLightness: number; // 0-1
  
  // Glass effect
  glassOpacity: number; // 0-1
  glassBlur: number; // px
  glassSaturation: number; // multiplier (1 = 100%)
  glassBrightness: number; // multiplier (1 = 100%)
  
  // Borders & shadows
  radius: number; // px
  shadowStrength: number; // 0-1
  highlightStrength: number; // 0-1
  
  // Text
  textBrightness: number; // 0-1
}

export const DEFAULT_THEME: DashboardTheme = {
  accent: '#8be9ff',
  backgroundHue: 226,
  backgroundSaturation: 0.5,
  backgroundLightness: 0.18,
  glassOpacity: 0.85,
  glassBlur: 64,
  glassSaturation: 2.8,
  glassBrightness: 1.25,
  radius: 24,
  shadowStrength: 0.9,
  highlightStrength: 0.85,
  textBrightness: 0.9,
};

/**
 * Preset themes for quick switching
 */
export const THEME_PRESETS: Record<string, DashboardTheme> = {
  'Aurora': {
    ...DEFAULT_THEME,
    accent: '#8be9ff',
    backgroundHue: 226,
  },
  'Amethyst': {
    ...DEFAULT_THEME,
    accent: '#a78bfa',
    backgroundHue: 270,
  },
  'Emerald': {
    ...DEFAULT_THEME,
    accent: '#34d399',
    backgroundHue: 160,
  },
  'Rose': {
    ...DEFAULT_THEME,
    accent: '#fb7185',
    backgroundHue: 350,
  },
  'Amber': {
    ...DEFAULT_THEME,
    accent: '#fbbf24',
    backgroundHue: 45,
  },
};

export const THEME_STORAGE_KEY = 'aurora.dashboard.theme';

/**
 * Utility functions for theme management
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const hue = Math.round(h * 60);
  return { h: (hue + 360) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToCss(h: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${clamp(a, 0, 1)})`;
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}


