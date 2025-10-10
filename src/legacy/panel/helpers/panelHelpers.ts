/**
 * Panel Organization Helpers
 * Utilities for creating clean, well-organized control panels
 */

import type { Pane } from 'tweakpane';

type PaneContainer = Pick<
  Pane,
  'addFolder' | 'addBinding' | 'addBlade' | 'addButton' | 'addInput' | 'addMonitor' | 'refresh'
>;

/**
 * Section configuration
 */
export interface SectionConfig {
  title: string;
  icon?: string;
  description?: string;
  expanded?: boolean;
}

/**
 * Create a section with optional description and icon
 */
export function createSection(
  container: PaneContainer,
  config: SectionConfig
): ReturnType<PaneContainer['addFolder']> {
  const titleWithIcon = config.icon ? `${config.icon} ${config.title}` : config.title;
  
  const folder = container.addFolder({
    title: titleWithIcon,
    expanded: config.expanded ?? true,
  });

  // Description removed for cleaner UI
  // Descriptions are now embedded in folder titles with icons

  return folder;
}

/**
 * Add a divider with optional label
 */
export function addDivider(
  container: PaneContainer,
  label?: string
): void {
  container.addBlade({ view: 'separator' });
  
  if (label) {
    container.addBlade({
      view: 'text',
      label: label,
      parse: (v) => String(v),
      value: '',
    });
  }
}

/**
 * Create a subsection (nested folder)
 */
export function createSubSection(
  parent: ReturnType<PaneContainer['addFolder']>,
  config: SectionConfig
): ReturnType<PaneContainer['addFolder']> {
  const titleWithIcon = config.icon ? `${config.icon} ${config.title}` : config.title;
  
  return parent.addFolder({
    title: titleWithIcon,
    expanded: config.expanded ?? false,
  });
}

/**
 * Create a metrics display section
 */
export function createMetricsSection(
  container: PaneContainer,
  title: string,
  icon: string = '📊'
): ReturnType<PaneContainer['addFolder']> {
  return createSection(container, {
    title,
    icon,
    description: 'Real-time performance and system metrics',
    expanded: true,
  });
}

/**
 * Create an essentials section for primary controls
 */
export function createEssentialsSection(
  container: PaneContainer,
  description?: string
): ReturnType<PaneContainer['addFolder']> {
  return createSection(container, {
    title: 'Essentials',
    icon: '⚡',
    description: description || 'Core controls you\'ll use most often',
    expanded: true,
  });
}

/**
 * Create an advanced section for power users
 */
export function createAdvancedSection(
  container: PaneContainer,
  description?: string
): ReturnType<PaneContainer['addFolder']> {
  return createSection(container, {
    title: 'Advanced',
    icon: '⚙️',
    description: description || 'Fine-tune settings for advanced control',
    expanded: false,
  });
}

/**
 * Create a monitoring section for live data
 */
export function createMonitoringSection(
  container: PaneContainer,
  description?: string
): ReturnType<PaneContainer['addFolder']> {
  return createSection(container, {
    title: 'Monitoring',
    icon: '📈',
    description: description || 'Live metrics and performance data',
    expanded: false,
  });
}

/**
 * Add a control group with label
 */
export function addControlGroup(
  container: PaneContainer,
  label: string,
  callback: (group: ReturnType<PaneContainer['addFolder']>) => void
): void {
  const group = container.addFolder({
    title: label,
    expanded: true,
  });
  
  callback(group);
}

/**
 * Add a quick action button
 */
export function addQuickAction(
  container: PaneContainer,
  config: {
    title: string;
    icon?: string;
    onClick: () => void;
  }
): void {
  const buttonTitle = config.icon ? `${config.icon} ${config.title}` : config.title;
  
  container.addButton({
    title: buttonTitle,
  }).on('click', config.onClick);
}

/**
 * Add a preset selector with descriptions
 */
export function addPresetSelector<T extends string>(
  container: PaneContainer,
  config: {
    label: string;
    options: Array<{ value: T; label: string; description?: string }>;
    value: T;
    onChange: (value: T) => void;
  }
): void {
  const optionsMap: Record<string, T> = {};
  config.options.forEach(opt => {
    optionsMap[opt.label] = opt.value;
  });

  container.addBlade({
    view: 'list',
    label: config.label,
    options: optionsMap,
    value: config.value,
  }).on('change', (ev: any) => {
    config.onChange(ev.value);
  });
}

/**
 * Panel organization presets
 */
export const PanelPresets = {
  /**
   * Standard panel layout: Essentials → Dynamics → Advanced
   */
  standard: (pane: Pane) => ({
    essentials: createEssentialsSection(pane),
    dynamics: createSection(pane, {
      title: 'Dynamics',
      icon: '🌀',
      description: 'Real-time behavior and modulation',
      expanded: false,
    }),
    advanced: createAdvancedSection(pane),
  }),

  /**
   * Performance-focused layout: Metrics → Controls → Optimization
   */
  performance: (pane: Pane) => ({
    metrics: createMetricsSection(pane, 'Performance'),
    controls: createEssentialsSection(pane, 'System controls'),
    optimization: createSection(pane, {
      title: 'Optimization',
      icon: '🚀',
      description: 'Performance tuning and quality settings',
      expanded: false,
    }),
  }),

  /**
   * Creative layout: Presets → Customize → Effects
   */
  creative: (pane: Pane) => ({
    presets: createSection(pane, {
      title: 'Presets',
      icon: '✨',
      description: 'Quick-start configurations',
      expanded: true,
    }),
    customize: createEssentialsSection(pane, 'Fine-tune your setup'),
    effects: createSection(pane, {
      title: 'Effects',
      icon: '🎨',
      description: 'Visual and audio effects',
      expanded: false,
    }),
  }),
};

/**
 * Color-coded section icons
 */
export const SectionIcons = {
  essentials: '⚡',
  performance: '📊',
  advanced: '⚙️',
  monitoring: '📈',
  presets: '✨',
  audio: '🎵',
  visual: '🎨',
  physics: '🌊',
  effects: '✨',
  materials: '💎',
  forces: '🌀',
  emitters: '💫',
  boundaries: '📦',
  camera: '📷',
  lighting: '💡',
  postfx: '🌟',
  theme: '🎨',
  settings: '⚙️',
  help: '❓',
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
};

