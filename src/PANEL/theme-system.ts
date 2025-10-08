/**
 * PANEL/theme-system.ts - Advanced theme and color palette system
 * Beautiful, comprehensive theming with glassmorphism effects
 */

export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: {
    base: string;
    overlay: string;
    glass: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    light: string;
    medium: string;
    heavy: string;
  };
  shadow: {
    ambient: string;
    glow: string;
    inner: string;
  };
  gradient: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface GlassmorphismEffect {
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
  palette: ColorPalette;
  glassmorphism: GlassmorphismEffect;
  borderRadius: number;
  fontSize: {
    small: number;
    medium: number;
    large: number;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

/**
 * Pre-configured premium themes
 */
export const PREMIUM_THEMES: Record<string, ThemeConfig> = {
  COSMIC_BLUE: {
    id: 'cosmic-blue',
    name: '🌌 Cosmic Blue',
    description: 'Deep space with ethereal blue accents',
    palette: {
      name: 'Cosmic Blue',
      primary: '#5078b4',
      secondary: '#648cc8',
      accent: '#a78bfa',
      background: {
        base: 'rgba(15, 23, 42, 0.95)',
        overlay: 'rgba(30, 41, 82, 0.85)',
        glass: 'rgba(35, 46, 92, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(255, 255, 255, 0.15)',
        medium: 'rgba(255, 255, 255, 0.25)',
        heavy: 'rgba(80, 120, 180, 0.50)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.5)',
        glow: 'rgba(80, 120, 180, 0.5)',
        inner: 'rgba(80, 120, 180, 0.1)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #5078b4 0%, #648cc8 50%, #a78bfa 100%)',
        secondary: 'linear-gradient(135deg, rgba(80, 120, 180, 0.3) 0%, rgba(100, 140, 200, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #a78bfa 0%, #5078b4 50%, #5a80b8 100%)',
      },
    },
    glassmorphism: {
      blur: 50,
      saturation: 200,
      brightness: 1.2,
      contrast: 1.15,
      opacity: 0.85,
      borderOpacity: 0.25,
      shadowIntensity: 1.0,
    },
    borderRadius: 20,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  AURORA_PURPLE: {
    id: 'aurora-purple',
    name: '🌠 Aurora Purple',
    description: 'Mystical purple aurora with soft gradients',
    palette: {
      name: 'Aurora Purple',
      primary: '#a78bfa',
      secondary: '#c084fc',
      accent: '#e879f9',
      background: {
        base: 'rgba(20, 10, 35, 0.95)',
        overlay: 'rgba(45, 25, 65, 0.85)',
        glass: 'rgba(60, 35, 85, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(167, 139, 250, 0.15)',
        medium: 'rgba(167, 139, 250, 0.30)',
        heavy: 'rgba(167, 139, 250, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.6)',
        glow: 'rgba(167, 139, 250, 0.6)',
        inner: 'rgba(167, 139, 250, 0.15)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #e879f9 100%)',
        secondary: 'linear-gradient(135deg, rgba(167, 139, 250, 0.3) 0%, rgba(192, 132, 252, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #e879f9 0%, #c084fc 50%, #a78bfa 100%)',
      },
    },
    glassmorphism: {
      blur: 60,
      saturation: 220,
      brightness: 1.3,
      contrast: 1.2,
      opacity: 0.88,
      borderOpacity: 0.30,
      shadowIntensity: 1.2,
    },
    borderRadius: 24,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },

  EMERALD_FOREST: {
    id: 'emerald-forest',
    name: '🌲 Emerald Forest',
    description: 'Deep forest green with natural tones',
    palette: {
      name: 'Emerald Forest',
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#6ee7b7',
      background: {
        base: 'rgba(6, 20, 15, 0.95)',
        overlay: 'rgba(15, 35, 25, 0.85)',
        glass: 'rgba(20, 45, 35, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(16, 185, 129, 0.15)',
        medium: 'rgba(16, 185, 129, 0.30)',
        heavy: 'rgba(16, 185, 129, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.6)',
        glow: 'rgba(16, 185, 129, 0.5)',
        inner: 'rgba(16, 185, 129, 0.12)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
        secondary: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(52, 211, 153, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #6ee7b7 0%, #34d399 50%, #10b981 100%)',
      },
    },
    glassmorphism: {
      blur: 55,
      saturation: 180,
      brightness: 1.15,
      contrast: 1.1,
      opacity: 0.82,
      borderOpacity: 0.28,
      shadowIntensity: 0.9,
    },
    borderRadius: 18,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 380, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  SUNSET_ORANGE: {
    id: 'sunset-orange',
    name: '🌅 Sunset Orange',
    description: 'Warm sunset with vibrant orange hues',
    palette: {
      name: 'Sunset Orange',
      primary: '#f59e0b',
      secondary: '#fb923c',
      accent: '#fbbf24',
      background: {
        base: 'rgba(30, 15, 5, 0.95)',
        overlay: 'rgba(50, 25, 10, 0.85)',
        glass: 'rgba(70, 35, 15, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(245, 158, 11, 0.15)',
        medium: 'rgba(245, 158, 11, 0.30)',
        heavy: 'rgba(245, 158, 11, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.6)',
        glow: 'rgba(245, 158, 11, 0.5)',
        inner: 'rgba(245, 158, 11, 0.12)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 50%, #fbbf24 100%)',
        secondary: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(251, 146, 60, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #fbbf24 0%, #fb923c 50%, #f59e0b 100%)',
      },
    },
    glassmorphism: {
      blur: 48,
      saturation: 210,
      brightness: 1.25,
      contrast: 1.18,
      opacity: 0.85,
      borderOpacity: 0.25,
      shadowIntensity: 1.1,
    },
    borderRadius: 22,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  CRIMSON_FIRE: {
    id: 'crimson-fire',
    name: '🔥 Crimson Fire',
    description: 'Intense red with fiery energy',
    palette: {
      name: 'Crimson Fire',
      primary: '#ef4444',
      secondary: '#f87171',
      accent: '#fca5a5',
      background: {
        base: 'rgba(25, 5, 5, 0.95)',
        overlay: 'rgba(45, 10, 10, 0.85)',
        glass: 'rgba(65, 15, 15, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(239, 68, 68, 0.15)',
        medium: 'rgba(239, 68, 68, 0.30)',
        heavy: 'rgba(239, 68, 68, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.7)',
        glow: 'rgba(239, 68, 68, 0.6)',
        inner: 'rgba(239, 68, 68, 0.15)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #ef4444 0%, #f87171 50%, #fca5a5 100%)',
        secondary: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(248, 113, 113, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #fca5a5 0%, #f87171 50%, #ef4444 100%)',
      },
    },
    glassmorphism: {
      blur: 52,
      saturation: 230,
      brightness: 1.22,
      contrast: 1.2,
      opacity: 0.86,
      borderOpacity: 0.27,
      shadowIntensity: 1.3,
    },
    borderRadius: 20,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  OCEAN_CYAN: {
    id: 'ocean-cyan',
    name: '🌊 Ocean Cyan',
    description: 'Deep ocean blue with cyan highlights',
    palette: {
      name: 'Ocean Cyan',
      primary: '#06b6d4',
      secondary: '#22d3ee',
      accent: '#67e8f9',
      background: {
        base: 'rgba(5, 15, 25, 0.95)',
        overlay: 'rgba(10, 25, 40, 0.85)',
        glass: 'rgba(15, 35, 55, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(6, 182, 212, 0.15)',
        medium: 'rgba(6, 182, 212, 0.30)',
        heavy: 'rgba(6, 182, 212, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.6)',
        glow: 'rgba(6, 182, 212, 0.5)',
        inner: 'rgba(6, 182, 212, 0.12)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
        secondary: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(34, 211, 238, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
      },
    },
    glassmorphism: {
      blur: 58,
      saturation: 190,
      brightness: 1.18,
      contrast: 1.12,
      opacity: 0.84,
      borderOpacity: 0.26,
      shadowIntensity: 1.0,
    },
    borderRadius: 21,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  MIDNIGHT_DARK: {
    id: 'midnight-dark',
    name: '🌑 Midnight Dark',
    description: 'Pure dark mode with subtle highlights',
    palette: {
      name: 'Midnight Dark',
      primary: '#6b7280',
      secondary: '#9ca3af',
      accent: '#d1d5db',
      background: {
        base: 'rgba(5, 5, 10, 0.98)',
        overlay: 'rgba(10, 10, 20, 0.90)',
        glass: 'rgba(15, 15, 30, 0.80)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.70)',
        muted: 'rgba(255, 255, 255, 0.45)',
      },
      border: {
        light: 'rgba(255, 255, 255, 0.10)',
        medium: 'rgba(255, 255, 255, 0.20)',
        heavy: 'rgba(255, 255, 255, 0.40)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.8)',
        glow: 'rgba(156, 163, 175, 0.3)',
        inner: 'rgba(156, 163, 175, 0.08)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 50%, #d1d5db 100%)',
        secondary: 'linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(156, 163, 175, 0.15) 100%)',
        accent: 'linear-gradient(180deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)',
      },
    },
    glassmorphism: {
      blur: 40,
      saturation: 120,
      brightness: 1.05,
      contrast: 1.08,
      opacity: 0.90,
      borderOpacity: 0.20,
      shadowIntensity: 1.5,
    },
    borderRadius: 16,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  },

  ROSE_GOLD: {
    id: 'rose-gold',
    name: '🌹 Rose Gold',
    description: 'Elegant rose gold with warm tones',
    palette: {
      name: 'Rose Gold',
      primary: '#ec4899',
      secondary: '#f472b6',
      accent: '#fda4af',
      background: {
        base: 'rgba(25, 10, 15, 0.95)',
        overlay: 'rgba(40, 20, 28, 0.85)',
        glass: 'rgba(55, 30, 40, 0.75)',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.50)',
      },
      border: {
        light: 'rgba(236, 72, 153, 0.15)',
        medium: 'rgba(236, 72, 153, 0.30)',
        heavy: 'rgba(236, 72, 153, 0.60)',
      },
      shadow: {
        ambient: 'rgba(0, 0, 0, 0.6)',
        glow: 'rgba(236, 72, 153, 0.5)',
        inner: 'rgba(236, 72, 153, 0.12)',
      },
      gradient: {
        primary: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fda4af 100%)',
        secondary: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(244, 114, 182, 0.2) 100%)',
        accent: 'linear-gradient(180deg, #fda4af 0%, #f472b6 50%, #ec4899 100%)',
      },
    },
    glassmorphism: {
      blur: 54,
      saturation: 205,
      brightness: 1.2,
      contrast: 1.16,
      opacity: 0.85,
      borderOpacity: 0.28,
      shadowIntensity: 1.1,
    },
    borderRadius: 23,
    fontSize: { small: 11, medium: 13, large: 16 },
    spacing: { small: 8, medium: 12, large: 16 },
    animation: { duration: 430, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
};

/**
 * ThemeManager - Manage themes and apply them to UI
 */
export class ThemeManager {
  private currentTheme: ThemeConfig;
  private customThemes: Map<string, ThemeConfig> = new Map();
  private styleElement: HTMLStyleElement | null = null;
  private onThemeChange?: (theme: ThemeConfig) => void;

  constructor(initialTheme: ThemeConfig = PREMIUM_THEMES.COSMIC_BLUE, onThemeChange?: (theme: ThemeConfig) => void) {
    this.currentTheme = initialTheme;
    this.onThemeChange = onThemeChange;
    this.loadCustomThemes();
    this.applyTheme(this.currentTheme);
  }

  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    return [
      ...Object.values(PREMIUM_THEMES),
      ...Array.from(this.customThemes.values()),
    ];
  }

  /**
   * Get theme by ID
   */
  getTheme(id: string): ThemeConfig | null {
    return PREMIUM_THEMES[id.toUpperCase().replace(/-/g, '_')] || this.customThemes.get(id) || null;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  /**
   * Apply theme to UI
   */
  applyTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
    this.injectThemeStyles(theme);
    this.saveCurrentTheme(theme.id);
    this.onThemeChange?.(theme);
    
    console.log(`🎨 Applied theme: ${theme.name}`);
  }

  /**
   * Switch to theme by ID
   */
  switchTheme(themeId: string): boolean {
    const theme = this.getTheme(themeId);
    if (theme) {
      this.applyTheme(theme);
      return true;
    }
    return false;
  }

  /**
   * Create custom theme
   */
  createCustomTheme(theme: ThemeConfig): void {
    this.customThemes.set(theme.id, theme);
    this.saveCustomThemes();
    console.log(`✨ Created custom theme: ${theme.name}`);
  }

  /**
   * Delete custom theme
   */
  deleteCustomTheme(themeId: string): boolean {
    if (this.customThemes.has(themeId)) {
      this.customThemes.delete(themeId);
      this.saveCustomThemes();
      return true;
    }
    return false;
  }

  /**
   * Export theme as JSON
   */
  exportTheme(themeId?: string): string {
    const theme = themeId ? this.getTheme(themeId) : this.currentTheme;
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(json: string): ThemeConfig | null {
    try {
      const theme = JSON.parse(json) as ThemeConfig;
      if (this.validateTheme(theme)) {
        this.createCustomTheme(theme);
        return theme;
      }
    } catch (error) {
      console.error('Failed to import theme:', error);
    }
    return null;
  }

  /**
   * Validate theme structure
   */
  private validateTheme(theme: any): theme is ThemeConfig {
    return (
      theme &&
      typeof theme.id === 'string' &&
      typeof theme.name === 'string' &&
      theme.palette &&
      theme.glassmorphism
    );
  }

  /**
   * Inject theme CSS variables
   */
  private injectThemeStyles(theme: ThemeConfig): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'theme-manager-styles';
      document.head.appendChild(this.styleElement);
    }

    const { palette, glassmorphism, borderRadius, fontSize, spacing, animation } = theme;

    this.styleElement.textContent = `
      :root {
        /* Colors */
        --theme-primary: ${palette.primary};
        --theme-secondary: ${palette.secondary};
        --theme-accent: ${palette.accent};
        
        /* Backgrounds */
        --theme-bg-base: ${palette.background.base};
        --theme-bg-overlay: ${palette.background.overlay};
        --theme-bg-glass: ${palette.background.glass};
        
        /* Text */
        --theme-text-primary: ${palette.text.primary};
        --theme-text-secondary: ${palette.text.secondary};
        --theme-text-muted: ${palette.text.muted};
        
        /* Borders */
        --theme-border-light: ${palette.border.light};
        --theme-border-medium: ${palette.border.medium};
        --theme-border-heavy: ${palette.border.heavy};
        
        /* Shadows */
        --theme-shadow-ambient: ${palette.shadow.ambient};
        --theme-shadow-glow: ${palette.shadow.glow};
        --theme-shadow-inner: ${palette.shadow.inner};
        
        /* Gradients */
        --theme-gradient-primary: ${palette.gradient.primary};
        --theme-gradient-secondary: ${palette.gradient.secondary};
        --theme-gradient-accent: ${palette.gradient.accent};
        
        /* Glassmorphism */
        --theme-glass-blur: ${glassmorphism.blur}px;
        --theme-glass-saturation: ${glassmorphism.saturation}%;
        --theme-glass-brightness: ${glassmorphism.brightness};
        --theme-glass-contrast: ${glassmorphism.contrast};
        --theme-glass-opacity: ${glassmorphism.opacity};
        --theme-glass-border-opacity: ${glassmorphism.borderOpacity};
        --theme-glass-shadow-intensity: ${glassmorphism.shadowIntensity};
        
        /* Border Radius */
        --theme-border-radius: ${borderRadius}px;
        --theme-border-radius-sm: ${borderRadius * 0.6}px;
        --theme-border-radius-lg: ${borderRadius * 1.2}px;
        
        /* Font Sizes */
        --theme-font-sm: ${fontSize.small}px;
        --theme-font-md: ${fontSize.medium}px;
        --theme-font-lg: ${fontSize.large}px;
        
        /* Spacing */
        --theme-spacing-sm: ${spacing.small}px;
        --theme-spacing-md: ${spacing.medium}px;
        --theme-spacing-lg: ${spacing.large}px;
        
        /* Animation */
        --theme-animation-duration: ${animation.duration}ms;
        --theme-animation-easing: ${animation.easing};
      }
    `;
  }

  /**
   * Save current theme ID to localStorage
   */
  private saveCurrentTheme(themeId: string): void {
    try {
      localStorage.setItem('flow-current-theme', themeId);
    } catch (error) {
      console.warn('Failed to save current theme:', error);
    }
  }

  /**
   * Load saved theme from localStorage
   */
  loadSavedTheme(): void {
    try {
      const savedThemeId = localStorage.getItem('flow-current-theme');
      if (savedThemeId) {
        this.switchTheme(savedThemeId);
      }
    } catch (error) {
      console.warn('Failed to load saved theme:', error);
    }
  }

  /**
   * Save custom themes to localStorage
   */
  private saveCustomThemes(): void {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem('flow-custom-themes', JSON.stringify(themes));
    } catch (error) {
      console.warn('Failed to save custom themes:', error);
    }
  }

  /**
   * Load custom themes from localStorage
   */
  private loadCustomThemes(): void {
    try {
      const saved = localStorage.getItem('flow-custom-themes');
      if (saved) {
        const themes = JSON.parse(saved) as ThemeConfig[];
        themes.forEach(theme => {
          if (this.validateTheme(theme)) {
            this.customThemes.set(theme.id, theme);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load custom themes:', error);
    }
  }

  /**
   * Dispose theme manager
   */
  dispose(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}



