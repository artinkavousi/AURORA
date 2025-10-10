/**
 * PANEL/panels/theme.ts - Theme & preset manager for the adaptive dashboard
 */

import type { Pane } from 'tweakpane';
import type { ListBladeApi } from 'tweakpane/dist/types/blade/list/api/list';
import type { Dashboard, DashboardTheme } from '../dashboard';
import { DEFAULT_THEME } from '../dashboard';

interface ThemePreset {
  id: string;
  name: string;
  theme: DashboardTheme;
  builtIn?: boolean;
}

// Type for Tweakpane containers (Pane and tab pages)
// Note: Folders only support addBinding (not addInput/addMonitor)
interface PaneContainer {
  addFolder(params: { title: string; expanded?: boolean }): any;
  addBinding(target: any, key: string, params?: any): any;
  addBlade(params: any): any;
  addButton(params: { title: string }): any;
  refresh?(): void;
}

const PRESET_STORAGE_KEY = 'aurora.dashboard.theme.presets';

const BUILT_IN_PRESETS: ThemePreset[] = [
  { id: 'aurora', name: 'Aurora (Default)', theme: { ...DEFAULT_THEME }, builtIn: true },
  {
    id: 'midnight',
    name: 'Midnight Drift',
    theme: {
      accent: '#5f6cff',
      backgroundHue: 222,
      backgroundSaturation: 0.52,
      backgroundLightness: 0.18,
      glassOpacity: 0.82,
      glassBlur: 48,
      glassSaturation: 2.4,
      glassBrightness: 1.06,
      radius: 24,
      shadowStrength: 0.95,
      highlightStrength: 0.6,
      textBrightness: 0.78,
    },
    builtIn: true,
  },
  {
    id: 'solaris',
    name: 'Solaris Bloom',
    theme: {
      accent: '#ffb656',
      backgroundHue: 32,
      backgroundSaturation: 0.58,
      backgroundLightness: 0.32,
      glassOpacity: 0.74,
      glassBlur: 36,
      glassSaturation: 1.9,
      glassBrightness: 1.18,
      radius: 20,
      shadowStrength: 0.75,
      highlightStrength: 0.85,
      textBrightness: 0.9,
    },
    builtIn: true,
  },
  {
    id: 'spectrum',
    name: 'Spectrum Aurora',
    theme: {
      accent: '#a579ff',
      backgroundHue: 268,
      backgroundSaturation: 0.44,
      backgroundLightness: 0.24,
      glassOpacity: 0.8,
      glassBlur: 56,
      glassSaturation: 2.6,
      glassBrightness: 1.2,
      radius: 26,
      shadowStrength: 0.88,
      highlightStrength: 0.9,
      textBrightness: 0.84,
    },
    builtIn: true,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class ThemeManagerPanel {
  private readonly dashboard: Dashboard;
  private readonly pane: Pane;
  private presets: ThemePreset[];
  private themeState: DashboardTheme;
  private selectedPresetId: string;
  private controlState = {
    customName: '',
  };
  private presetSelector: ListBladeApi<string> | null = null;
  private deleteState = {
    preset: '',
  };

  constructor(dashboard: Dashboard) {
    this.dashboard = dashboard;
    this.presets = this.loadPresets();
    this.themeState = { ...this.dashboard.getTheme() };
    this.selectedPresetId = this.matchPresetId(this.themeState) ?? this.presets[0].id;
    this.pane = dashboard.registerPanel({
      id: 'theme',
      title: '🪞 Theme Studio',
      icon: '🪞',
      description: 'Curate palettes, presets, and defaults for the dashboard',
    });

    this.buildPanel();
  }

  private buildPanel(): void {
    const tabs = (this.pane as any).addTab({
      pages: [
        { title: 'Presets' },
        { title: 'Surface' },
        { title: 'Accents' },
        { title: 'System' },
      ],
    });

    const presetsPage = tabs.pages[0] as unknown as PaneContainer;
    const surfacePage = tabs.pages[1] as unknown as PaneContainer;
    const accentPage = tabs.pages[2] as unknown as PaneContainer;
    const systemPage = tabs.pages[3] as unknown as PaneContainer;

    this.buildPresetsPage(presetsPage);
    this.buildSurfacePage(surfacePage);
    this.buildAccentPage(accentPage);
    this.buildSystemPage(systemPage);
  }

  private buildPresetsPage(container: PaneContainer): void {
    const folder = container.addFolder({ title: '🎛️ Preset Manager', expanded: true });

    this.presetSelector = folder.addBlade({
      view: 'list',
      label: 'Preset',
      options: this.buildPresetListItems(),
      value: this.selectedPresetId,
    }) as ListBladeApi<string>;
    this.presetSelector.on('change', (ev) => this.applyPreset(ev.value));

    folder.addBlade({ view: 'separator' });

    folder.addButton({ title: 'Set as Default' }).on('click', () => {
      this.dashboard.applyTheme({ ...this.themeState }, true);
    });

    folder.addButton({ title: 'Reset to Aurora' }).on('click', () => {
      this.applyPreset('aurora');
    });

    const customFolder = container.addFolder({ title: '📝 Custom Presets', expanded: false });
    customFolder.addBinding(this.controlState, 'customName', { label: 'Name' });
    customFolder.addButton({ title: '💾 Save Preset' }).on('click', () => {
      this.saveCustomPreset();
    });

    const deletable = this.presets.filter(p => !p.builtIn);
    if (deletable.length > 0) {
      this.deleteState.preset = deletable[0].id;
      const deleteFolder = container.addFolder({ title: '🗑️ Remove Custom', expanded: false });
      deleteFolder.addBinding(this.deleteState, 'preset', {
        label: 'Preset',
        options: deletable.reduce<Record<string, string>>((acc, preset) => {
          acc[preset.name] = preset.id;
          return acc;
        }, {}),
      });
      deleteFolder.addButton({ title: 'Delete Selected' }).on('click', () => {
        this.deletePreset(this.deleteState.preset);
      });
    }
  }

  private buildSurfacePage(container: PaneContainer): void {
    const folder = container.addFolder({ title: 'Surface & Glass', expanded: true });

    folder.addBinding(this.themeState, 'backgroundHue', {
      label: 'Hue',
      min: 0,
      max: 360,
      step: 1,
    }).on('change', (ev: any) => this.commitTheme({ backgroundHue: ev.value }));

    folder.addBinding(this.themeState, 'backgroundSaturation', {
      label: 'Saturation',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ backgroundSaturation: clamp(ev.value, 0, 1) }));

    folder.addBinding(this.themeState, 'backgroundLightness', {
      label: 'Lightness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ backgroundLightness: clamp(ev.value, 0, 1) }));

    folder.addBlade({ view: 'separator' });

    folder.addBinding(this.themeState, 'glassOpacity', {
      label: 'Opacity',
      min: 0.5,
      max: 0.95,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ glassOpacity: ev.value }));

    folder.addBinding(this.themeState, 'glassBlur', {
      label: 'Blur',
      min: 12,
      max: 64,
      step: 1,
    }).on('change', (ev: any) => this.commitTheme({ glassBlur: ev.value }));

    folder.addBinding(this.themeState, 'glassSaturation', {
      label: 'Saturation Boost',
      min: 1.0,
      max: 3.0,
      step: 0.05,
    }).on('change', (ev: any) => this.commitTheme({ glassSaturation: ev.value }));

    folder.addBinding(this.themeState, 'glassBrightness', {
      label: 'Brightness',
      min: 0.7,
      max: 1.4,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ glassBrightness: ev.value }));

    folder.addBinding(this.themeState, 'radius', {
      label: 'Corner Radius',
      min: 14,
      max: 32,
      step: 1,
    }).on('change', (ev: any) => this.commitTheme({ radius: ev.value }));
  }

  private buildAccentPage(container: PaneContainer): void {
    const folder = container.addFolder({ title: 'Accents & Lighting', expanded: true });

    folder.addBinding(this.themeState, 'accent', {
      label: 'Accent',
      view: 'color',
    }).on('change', (ev: any) => this.commitTheme({ accent: ev.value }));

    folder.addBinding(this.themeState, 'highlightStrength', {
      label: 'Highlight',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ highlightStrength: ev.value }));

    folder.addBinding(this.themeState, 'shadowStrength', {
      label: 'Shadow',
      min: 0.4,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ shadowStrength: ev.value }));

    folder.addBinding(this.themeState, 'textBrightness', {
      label: 'Text Brightness',
      min: 0.6,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => this.commitTheme({ textBrightness: ev.value }));
  }

  private buildSystemPage(container: PaneContainer): void {
    const folder = container.addFolder({ title: 'System Theme', expanded: true });

    folder.addBinding(this.themeState, 'backgroundHue', { label: 'Hue', readonly: true });
    folder.addBinding(this.themeState, 'glassBlur', { label: 'Blur', readonly: true });
    folder.addBinding(this.themeState, 'glassOpacity', { label: 'Opacity', readonly: true });
    folder.addBinding(this.themeState, 'accent', { label: 'Accent', readonly: true });

    folder.addBlade({ view: 'separator' });

    folder.addButton({ title: '🔄 Revert Unsaved Changes' }).on('click', () => {
      this.refreshFromDashboard();
    });
  }

  private applyPreset(id: string): void {
    const preset = this.presets.find((p) => p.id === id);
    if (!preset) return;

    this.themeState = { ...preset.theme };
    this.selectedPresetId = id;
    this.dashboard.applyTheme({ ...this.themeState }, false);
    this.refreshPresetSelector();
    (this.pane as any).refresh?.();
  }

  private saveCustomPreset(): void {
    const name = this.controlState.customName.trim();
    if (!name) {
      alert('Please provide a name for your preset.');
      return;
    }

    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const preset: ThemePreset = {
      id,
      name,
      theme: { ...this.themeState },
    };

    this.presets.push(preset);
    this.persistCustomPresets();
    this.selectedPresetId = id;
    this.controlState.customName = '';
    this.refreshPresetSelector();
    (this.pane as any).refresh?.();
  }

  private deletePreset(id: string): void {
    const index = this.presets.findIndex((preset) => preset.id === id && !preset.builtIn);
    if (index === -1) return;

    const removed = this.presets.splice(index, 1)[0];
    this.persistCustomPresets();

    if (this.selectedPresetId === removed.id) {
      this.applyPreset('aurora');
    }

    const remaining = this.presets.filter((preset) => !preset.builtIn && preset.id !== 'custom');
    this.deleteState.preset = remaining[0]?.id ?? '';

    this.refreshPresetSelector();
    (this.pane as any).refresh?.();
  }

  private commitTheme(partial: Partial<DashboardTheme>): void {
    this.themeState = { ...this.themeState, ...partial };
    this.dashboard.updateTheme(partial, false);
    this.selectedPresetId = 'custom';
    if (!this.presets.find((p) => p.id === 'custom')) {
      this.presets.unshift({ id: 'custom', name: 'Custom Session', theme: { ...this.themeState } });
    } else {
      const custom = this.presets.find((p) => p.id === 'custom');
      if (custom) custom.theme = { ...this.themeState };
    }
    this.refreshPresetSelector();
  }

  private refreshFromDashboard(): void {
    this.themeState = { ...this.dashboard.getTheme() };
    this.selectedPresetId = this.matchPresetId(this.themeState) ?? this.selectedPresetId;
    this.refreshPresetSelector();
    (this.pane as any).refresh?.();
  }

  private loadPresets(): ThemePreset[] {
    const stored = this.loadStoredPresets();
    return [...BUILT_IN_PRESETS, ...stored];
  }

  private loadStoredPresets(): ThemePreset[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ThemePreset[];
      return parsed.map((preset) => ({ ...preset, builtIn: false }));
    } catch (error) {
      console.warn('[ThemeManager] Failed to load custom presets', error);
      return [];
    }
  }

  private persistCustomPresets(): void {
    if (typeof window === 'undefined') return;
    const customs = this.presets.filter((preset) => !preset.builtIn && preset.id !== 'custom');
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(customs));
    } catch (error) {
      console.warn('[ThemeManager] Failed to persist custom presets', error);
    }
  }

  private matchPresetId(theme: DashboardTheme): string | null {
    const serialized = JSON.stringify(theme);
    const found = this.presets.find((preset) => JSON.stringify(preset.theme) === serialized);
    return found ? found.id : null;
  }

  private buildPresetListItems(): { text: string; value: string }[] {
    return this.presets.map((preset) => ({ text: preset.name, value: preset.id }));
  }

  private refreshPresetSelector(): void {
    if (this.presetSelector) {
      this.presetSelector.options = this.buildPresetListItems();
      this.presetSelector.value = this.selectedPresetId;
    }
  }
}
