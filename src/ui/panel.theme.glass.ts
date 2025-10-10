import { Pane } from 'tweakpane';
import type { TpPluginBundle } from 'tweakpane';

export interface GlassThemeTokens {
  accent: string;
  surface: string;
  surfaceStrong: string;
  outline: string;
  textPrimary: string;
  textSecondary: string;
  panelBlur: string;
  panelOpacity: number;
  panelSaturation: number;
  panelBrightness: number;
  radius: number;
  shadow: string;
  highlight: string;
}

export const ultraGlassTokens: GlassThemeTokens = {
  accent: '#8be9ff',
  surface: 'rgba(18, 22, 40, 0.76)',
  surfaceStrong: 'rgba(26, 32, 56, 0.92)',
  outline: 'rgba(255, 255, 255, 0.08)',
  textPrimary: 'rgba(255, 255, 255, 0.92)',
  textSecondary: 'rgba(255, 255, 255, 0.56)',
  panelBlur: '40px',
  panelOpacity: 0.78,
  panelSaturation: 1.45,
  panelBrightness: 1.12,
  radius: 22,
  shadow: '0 20px 60px rgba(3, 6, 18, 0.45)',
  highlight: '0 1px 0 rgba(255, 255, 255, 0.22)',
};

const STYLE_ID = 'aurora-glass-pane';

let registered = false;

const glassThemePlugin: TpPluginBundle = {
  id: 'aurora-glass-theme',
  plugins: [
    {
      id: 'aurora-glass-theme',
      type: 'blade',
      css: '',
    },
  ],
} as unknown as TpPluginBundle;

function ensureStyle(tokens: GlassThemeTokens): void {
  if (typeof document === 'undefined') {
    return;
  }

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
  .tp-aurora-glass {
    --tp-base-background-color: ${tokens.surface};
    --tp-base-background-color-hover: ${tokens.surfaceStrong};
    --tp-base-border-color: ${tokens.outline};
    --tp-base-shadow-color: ${tokens.shadow};
    --tp-base-handle-color: ${tokens.accent};
    --tp-label-color: ${tokens.textSecondary};
    --tp-input-foreground-color: ${tokens.textPrimary};
    --tp-input-background-color: rgba(255, 255, 255, 0.02);
    --tp-input-background-color-active: rgba(255, 255, 255, 0.07);
    --tp-monitor-foreground-color: ${tokens.accent};
    --tp-slider-foreground-color: ${tokens.accent};
    backdrop-filter: saturate(${tokens.panelSaturation}) brightness(${tokens.panelBrightness}) blur(${tokens.panelBlur});
    border-radius: ${tokens.radius}px;
    box-shadow: ${tokens.shadow};
  }

  .tp-aurora-glass .tp-lblv_v {
    color: ${tokens.textSecondary};
  }

  .tp-aurora-glass .tp-rotv {
    color: ${tokens.textPrimary};
  }

  .tp-aurora-glass .tp-btnv_b {
    color: ${tokens.textPrimary};
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
    border-radius: ${tokens.radius / 1.5}px;
    border: 1px solid ${tokens.outline};
    box-shadow: ${tokens.highlight};
  }

  .tp-aurora-glass .tp-btnv_b:active {
    transform: translateY(1px);
  }

  .tp-aurora-glass .tp-rotv:focus-within,
  .tp-aurora-glass .tp-lblv:focus-within {
    outline: 1px solid ${tokens.accent};
    outline-offset: 2px;
  }
  `;
}

export function registerGlassTheme(tokens: Partial<GlassThemeTokens> = {}): GlassThemeTokens {
  if (!registered) {
    if (typeof (Pane as unknown as { registerPlugin?: (bundle: TpPluginBundle[]) => void }).registerPlugin === 'function') {
      (Pane as unknown as { registerPlugin: (bundle: TpPluginBundle[]) => void }).registerPlugin([glassThemePlugin]);
    }
    registered = true;
  }

  const resolved: GlassThemeTokens = { ...ultraGlassTokens, ...tokens };
  ensureStyle(resolved);
  return resolved;
}

export function attachGlassTheme(pane: Pane, tokens: Partial<GlassThemeTokens> = {}): void {
  const resolved = registerGlassTheme(tokens);
  pane.element.classList.add('tp-aurora-glass');
  pane.element.style.setProperty('--aurora-accent', resolved.accent);
  pane.element.style.setProperty('--aurora-text', resolved.textPrimary);
}
