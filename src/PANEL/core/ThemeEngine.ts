/**
 * PANEL/core/ThemeEngine.ts - Advanced theme system with CSS custom properties
 * Hot-swappable themes with glassmorphism effects
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  
  bgBase: string;
  bgOverlay: string;
  bgGlass: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  borderLight: string;
  borderMedium: string;
  borderHeavy: string;
  
  shadowAmbient: string;
  shadowGlow: string;
  shadowInner: string;
}

export interface ThemeGlassmorphism {
  blur: number;
  saturation: number;
  brightness: number;
  contrast: number;
  opacity: number;
  borderOpacity: number;
  shadowIntensity: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  glassmorphism: ThemeGlassmorphism;
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
  };
  animation: {
    fast: number;
    base: number;
    slow: number;
    easing: string;
    spring: string;
  };
}

/**
 * Built-in themes
 */
export const BUILTIN_THEMES: Record<string, ThemeConfig> = {
  'cosmic-blue': {
    id: 'cosmic-blue',
    name: '🌌 Cosmic Blue',
    description: 'Deep space with ethereal blue accents',
    colors: {
      primary: '#5078b4',
      secondary: '#648cc8',
      accent: '#a78bfa',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      
      bgBase: 'rgba(15, 23, 42, 0.95)',
      bgOverlay: 'rgba(30, 41, 82, 0.85)',
      bgGlass: 'rgba(35, 46, 92, 0.75)',
      
      textPrimary: 'rgba(255, 255, 255, 0.95)',
      textSecondary: 'rgba(255, 255, 255, 0.75)',
      textMuted: 'rgba(255, 255, 255, 0.50)',
      
      borderLight: 'rgba(255, 255, 255, 0.15)',
      borderMedium: 'rgba(255, 255, 255, 0.30)',
      borderHeavy: 'rgba(80, 120, 180, 0.60)',
      
      shadowAmbient: 'rgba(0, 0, 0, 0.50)',
      shadowGlow: 'rgba(80, 120, 180, 0.40)',
      shadowInner: 'rgba(80, 120, 180, 0.10)',
    },
    glassmorphism: {
      blur: 60,
      saturation: 220,
      brightness: 1.25,
      contrast: 1.2,
      opacity: 0.85,
      borderOpacity: 0.30,
      shadowIntensity: 1.0,
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    fontSize: { xs: 10, sm: 11, base: 13, lg: 15, xl: 18 },
    animation: {
      fast: 200,
      base: 300,
      slow: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
  
  'aurora-purple': {
    id: 'aurora-purple',
    name: '🌠 Aurora Purple',
    description: 'Mystical purple aurora with soft gradients',
    colors: {
      primary: '#a78bfa',
      secondary: '#c084fc',
      accent: '#e879f9',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      
      bgBase: 'rgba(20, 10, 35, 0.95)',
      bgOverlay: 'rgba(45, 25, 65, 0.85)',
      bgGlass: 'rgba(60, 35, 85, 0.75)',
      
      textPrimary: 'rgba(255, 255, 255, 0.95)',
      textSecondary: 'rgba(255, 255, 255, 0.75)',
      textMuted: 'rgba(255, 255, 255, 0.50)',
      
      borderLight: 'rgba(167, 139, 250, 0.15)',
      borderMedium: 'rgba(167, 139, 250, 0.30)',
      borderHeavy: 'rgba(167, 139, 250, 0.60)',
      
      shadowAmbient: 'rgba(0, 0, 0, 0.60)',
      shadowGlow: 'rgba(167, 139, 250, 0.50)',
      shadowInner: 'rgba(167, 139, 250, 0.10)',
    },
    glassmorphism: {
      blur: 60,
      saturation: 200,
      brightness: 1.20,
      contrast: 1.15,
      opacity: 0.85,
      borderOpacity: 0.30,
      shadowIntensity: 1.0,
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    fontSize: { xs: 10, sm: 11, base: 13, lg: 15, xl: 18 },
    animation: {
      fast: 200,
      base: 300,
      slow: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
  
  'cyberpunk-neon': {
    id: 'cyberpunk-neon',
    name: '🌃 Cyberpunk Neon',
    description: 'Futuristic neon lights with high contrast',
    colors: {
      primary: '#00ff9f',
      secondary: '#00d4ff',
      accent: '#ff006e',
      success: '#00ff9f',
      warning: '#ffb800',
      danger: '#ff006e',
      
      bgBase: 'rgba(10, 0, 20, 0.95)',
      bgOverlay: 'rgba(20, 10, 40, 0.85)',
      bgGlass: 'rgba(30, 15, 50, 0.75)',
      
      textPrimary: 'rgba(255, 255, 255, 0.95)',
      textSecondary: 'rgba(0, 255, 159, 0.85)',
      textMuted: 'rgba(255, 255, 255, 0.50)',
      
      borderLight: 'rgba(0, 255, 159, 0.20)',
      borderMedium: 'rgba(0, 255, 159, 0.40)',
      borderHeavy: 'rgba(0, 255, 159, 0.70)',
      
      shadowAmbient: 'rgba(0, 0, 0, 0.70)',
      shadowGlow: 'rgba(0, 255, 159, 0.60)',
      shadowInner: 'rgba(0, 255, 159, 0.15)',
    },
    glassmorphism: {
      blur: 50,
      saturation: 250,
      brightness: 1.30,
      contrast: 1.25,
      opacity: 0.80,
      borderOpacity: 0.40,
      shadowIntensity: 1.2,
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    fontSize: { xs: 10, sm: 11, base: 13, lg: 15, xl: 18 },
    animation: {
      fast: 150,
      base: 250,
      slow: 350,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
};

/**
 * ThemeEngine - CSS custom property based theming
 */
export class ThemeEngine {
  private currentThemeId: string;
  private customThemes: Map<string, ThemeConfig> = new Map();
  private styleElement: HTMLStyleElement;
  
  constructor(defaultThemeId: string = 'cosmic-blue') {
    this.currentThemeId = defaultThemeId;
    this.styleElement = this.createStyleElement();
    this.applyTheme(this.getCurrentTheme());
  }
  
  /**
   * Create style element for theme CSS
   */
  private createStyleElement(): HTMLStyleElement {
    const existing = document.getElementById('theme-engine-styles');
    if (existing) {
      existing.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'theme-engine-styles';
    document.head.appendChild(style);
    return style;
  }
  
  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeConfig {
    return (
      this.customThemes.get(this.currentThemeId) ||
      BUILTIN_THEMES[this.currentThemeId] ||
      BUILTIN_THEMES['cosmic-blue']
    );
  }
  
  /**
   * Get current theme ID
   */
  getCurrentThemeId(): string {
    return this.currentThemeId;
  }
  
  /**
   * Apply theme
   */
  applyTheme(theme: ThemeConfig): void {
    this.currentThemeId = theme.id;
    
    // Generate CSS custom properties
    const css = this.generateThemeCSS(theme);
    this.styleElement.textContent = css;
    
    console.log(`🎨 Applied theme: ${theme.name}`);
  }
  
  /**
   * Switch theme by ID
   */
  switchTheme(themeId: string): boolean {
    const theme = this.customThemes.get(themeId) || BUILTIN_THEMES[themeId];
    if (!theme) {
      console.warn(`Theme ${themeId} not found`);
      return false;
    }
    
    this.applyTheme(theme);
    return true;
  }
  
  /**
   * Generate theme CSS
   */
  private generateThemeCSS(theme: ThemeConfig): string {
    const { colors, glassmorphism, borderRadius, spacing, fontSize, animation } = theme;
    
    return `
      :root {
        /* Colors */
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-danger: ${colors.danger};
        
        --color-bg-base: ${colors.bgBase};
        --color-bg-overlay: ${colors.bgOverlay};
        --color-bg-glass: ${colors.bgGlass};
        
        --color-text-primary: ${colors.textPrimary};
        --color-text-secondary: ${colors.textSecondary};
        --color-text-muted: ${colors.textMuted};
        
        --color-border-light: ${colors.borderLight};
        --color-border-medium: ${colors.borderMedium};
        --color-border-heavy: ${colors.borderHeavy};
        
        --color-shadow-ambient: ${colors.shadowAmbient};
        --color-shadow-glow: ${colors.shadowGlow};
        --color-shadow-inner: ${colors.shadowInner};
        
        /* Glassmorphism */
        --glass-blur: ${glassmorphism.blur}px;
        --glass-saturation: ${glassmorphism.saturation}%;
        --glass-brightness: ${glassmorphism.brightness};
        --glass-contrast: ${glassmorphism.contrast};
        --glass-opacity: ${glassmorphism.opacity};
        --glass-border-opacity: ${glassmorphism.borderOpacity};
        --glass-shadow-intensity: ${glassmorphism.shadowIntensity};
        
        /* Border Radius */
        --radius-sm: ${borderRadius.sm}px;
        --radius-md: ${borderRadius.md}px;
        --radius-lg: ${borderRadius.lg}px;
        --radius-xl: ${borderRadius.xl}px;
        
        /* Spacing */
        --space-xs: ${spacing.xs}px;
        --space-sm: ${spacing.sm}px;
        --space-md: ${spacing.md}px;
        --space-lg: ${spacing.lg}px;
        --space-xl: ${spacing.xl}px;
        
        /* Font Size */
        --text-xs: ${fontSize.xs}px;
        --text-sm: ${fontSize.sm}px;
        --text-base: ${fontSize.base}px;
        --text-lg: ${fontSize.lg}px;
        --text-xl: ${fontSize.xl}px;
        
        /* Animation */
        --duration-fast: ${animation.fast}ms;
        --duration-base: ${animation.base}ms;
        --duration-slow: ${animation.slow}ms;
        --easing-ease: ${animation.easing};
        --easing-spring: ${animation.spring};
      }
    `;
  }
  
  /**
   * Register custom theme
   */
  registerCustomTheme(theme: ThemeConfig): void {
    this.customThemes.set(theme.id, theme);
  }
  
  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    const builtin = Object.values(BUILTIN_THEMES);
    const custom = Array.from(this.customThemes.values());
    return [...builtin, ...custom];
  }
  
  /**
   * Export theme as JSON
   */
  exportTheme(themeId?: string): string {
    const id = themeId || this.currentThemeId;
    const theme = this.customThemes.get(id) || BUILTIN_THEMES[id];
    if (!theme) {
      throw new Error(`Theme ${id} not found`);
    }
    return JSON.stringify(theme, null, 2);
  }
  
  /**
   * Import theme from JSON
   */
  importTheme(json: string): ThemeConfig | null {
    try {
      const theme = JSON.parse(json) as ThemeConfig;
      this.registerCustomTheme(theme);
      return theme;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }
  
  /**
   * Delete a custom theme
   */
  deleteCustomTheme(themeId: string): boolean {
    if (!this.customThemes.has(themeId)) {
      return false;
    }
    this.customThemes.delete(themeId);
    return true;
  }
  
  /**
   * Create/register a custom theme (alias for registerCustomTheme)
   */
  createCustomTheme(theme: ThemeConfig): void {
    this.registerCustomTheme(theme);
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.styleElement.remove();
  }
}

