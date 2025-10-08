/**
 * PANEL/dashboard.ts - Unified adaptive dashboard with vertical tab navigation
 * Provides glassmorphism styling, docking, collapse transitions, and theme pipeline
 */

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import * as InfodumpPlugin from 'tweakpane-plugin-infodump';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials/dist/types/fps-graph/api/fps-graph';

export type DashboardDock = 'left' | 'right' | 'bottom';

export interface DashboardOptions {
  defaultDock?: DashboardDock;
  collapsed?: boolean;
  showInfo?: boolean;
  showFPS?: boolean;
  enableGlassmorphism?: boolean;
}

export interface DashboardPanelOptions {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  badge?: string;
}

export interface DashboardTheme {
  accent: string; // HEX color
  backgroundHue: number; // 0-360
  backgroundSaturation: number; // 0-1
  backgroundLightness: number; // 0-1
  glassOpacity: number; // 0-1
  glassBlur: number; // px
  glassSaturation: number; // multiplier (1 = 100%)
  glassBrightness: number; // multiplier (1 = 100%)
  radius: number; // px
  shadowStrength: number; // 0-1
  highlightStrength: number; // 0-1
  textBrightness: number; // 0-1
}

interface DashboardPanelInstance {
  config: DashboardPanelOptions;
  pane: Pane;
  tab: HTMLButtonElement;
  page: HTMLDivElement;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  pointerId: number;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
}

const DEFAULT_THEME: DashboardTheme = {
  accent: '#7dd3ff',
  backgroundHue: 218,
  backgroundSaturation: 0.48,
  backgroundLightness: 0.22,
  glassOpacity: 0.78,
  glassBlur: 42,
  glassSaturation: 2.0,
  glassBrightness: 1.12,
  radius: 22,
  shadowStrength: 0.9,
  highlightStrength: 0.7,
  textBrightness: 0.82,
};

const THEME_STORAGE_KEY = 'aurora.dashboard.theme.default';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

function hslToCss(h: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${clamp(a, 0, 1)})`;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Dashboard - Adaptive container that orchestrates all control panels
 */
export class Dashboard {
  private static pluginsRegistered = false;

  private readonly styleSheet: HTMLStyleElement;
  private readonly root: HTMLDivElement;
  private readonly tabRail: HTMLDivElement;
  private readonly tabList: HTMLDivElement;
  private readonly panelViewport: HTMLDivElement;
  private readonly collapseButton: HTMLButtonElement;
  private readonly dragHandle: HTMLDivElement;
  private readonly resizeHandle: HTMLDivElement;

  private readonly panels = new Map<string, DashboardPanelInstance>();
  private activePanelId: string | null = null;
  private collapsed = false;
  private dock: DashboardDock;
  private dragState: DragState | null = null;
  private resizeState: ResizeState | null = null;
  private readonly sideSize = { width: 360, height: 620 };
  private readonly sideSizeLimits = { width: [320, 460] as [number, number], height: [420, 760] as [number, number] };
  private readonly bottomSize = { width: 720, height: 360 };
  private readonly bottomSizeLimits = { width: [560, 960] as [number, number], height: [280, 520] as [number, number] };
  private sideOffsetTop = 96;
  private readonly sideInset = 24;
  private theme: DashboardTheme;
  private fpsGraph: FpsGraphBladeApi | null = null;

  constructor(options: DashboardOptions = {}) {
    if (!Dashboard.pluginsRegistered) {
      Pane.registerPlugin(EssentialsPlugin);
      Pane.registerPlugin(InfodumpPlugin);
      Dashboard.pluginsRegistered = true;
    }

    this.theme = this.loadPersistedTheme() ?? { ...DEFAULT_THEME };
    this.dock = options.defaultDock ?? 'right';

    this.styleSheet = this.injectStyles();
    this.root = this.createRoot();
    this.tabRail = this.createTabRail();
    this.tabList = this.createTabList();
    this.collapseButton = this.createCollapseButton();
    this.dragHandle = this.createDragHandle();
    this.panelViewport = this.createPanelViewport();
    this.resizeHandle = this.createResizeHandle();

    this.tabRail.appendChild(this.dragHandle);
    this.tabRail.appendChild(this.tabList);
    this.tabRail.appendChild(this.collapseButton);

    this.root.appendChild(this.tabRail);
    this.root.appendChild(this.panelViewport);
    this.root.appendChild(this.resizeHandle);

    document.body.appendChild(this.root);

    this.applyDock(this.dock);
    if (options.collapsed) {
      this.collapse();
    }

    if (options.showFPS) {
      this.createPerformancePanel();
    }
    if (options.showInfo) {
      this.createInfoPanel();
    }

    this.applyTheme(this.theme, false);
  }

  /** Register a panel and return its Tweakpane instance */
  public registerPanel(options: DashboardPanelOptions): Pane {
    if (this.panels.has(options.id)) {
      throw new Error(`Panel with id "${options.id}" already exists.`);
    }

    const page = document.createElement('div');
    page.className = 'aurora-panel-page';
    page.dataset.panelId = options.id;
    page.setAttribute('role', 'tabpanel');
    page.setAttribute('aria-hidden', 'true');
    this.panelViewport.appendChild(page);

    const pane = new Pane({
      container: page,
      title: options.title,
    });
    pane.element.classList.add('aurora-pane');

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'aurora-tab';
    tab.dataset.panelId = options.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.innerHTML = `
      <span class="aurora-tab-icon">${options.icon ?? '⬡'}</span>
      <span class="aurora-tab-label">${options.title}</span>
      <span class="aurora-tab-badge"></span>
    `;
    if (options.description) {
      tab.title = options.description;
    }
    tab.addEventListener('click', () => this.activatePanel(options.id));
    this.tabList.appendChild(tab);

    const instance: DashboardPanelInstance = { config: options, pane, tab, page };
    this.panels.set(options.id, instance);

    if (!this.activePanelId) {
      this.activatePanel(options.id);
    }

    this.updateTabOrientation();
    return pane;
  }

  /** Activate a panel by id */
  public activatePanel(id: string): void {
    const target = this.panels.get(id);
    if (!target) {
      console.warn(`[Dashboard] Panel "${id}" not found.`);
      return;
    }
    if (this.activePanelId === id) {
      this.expand();
      return;
    }

    this.panels.forEach((panel, panelId) => {
      const active = panelId === id;
      panel.page.classList.toggle('is-active', active);
      panel.page.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.tab.classList.toggle('is-active', active);
      panel.tab.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        requestAnimationFrame(() => panel.pane.refresh());
      }
    });

    this.activePanelId = id;
    this.expand();
  }

  public getActivePanelId(): string | null {
    return this.activePanelId;
  }

  /** Toggle collapse state */
  public toggleCollapse(): void {
    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  public collapse(): void {
    if (this.collapsed) return;
    this.collapsed = true;
    this.root.classList.add('is-collapsed');
    this.collapseButton.setAttribute('aria-expanded', 'false');
  }

  public expand(): void {
    if (!this.collapsed) return;
    this.collapsed = false;
    this.root.classList.remove('is-collapsed');
    this.collapseButton.setAttribute('aria-expanded', 'true');
  }

  public isCollapsed(): boolean {
    return this.collapsed;
  }

  public setDock(dock: DashboardDock): void {
    if (this.dock === dock) return;
    this.dock = dock;
    this.applyDock(dock);
  }

  public getDock(): DashboardDock {
    return this.dock;
  }

  public updateTheme(patch: Partial<DashboardTheme>, persist = true): void {
    this.theme = { ...this.theme, ...patch };
    this.applyTheme(this.theme, persist);
  }

  public applyTheme(theme: DashboardTheme, persist = true): void {
    this.theme = { ...theme };
    this.applyThemeVariables();
    if (persist) {
      this.persistTheme();
    }
  }

  public getTheme(): DashboardTheme {
    return { ...this.theme };
  }

  public setTabBadge(id: string, text: string): void {
    const instance = this.panels.get(id);
    if (!instance) return;
    const badge = instance.tab.querySelector<HTMLSpanElement>('.aurora-tab-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.toggle('is-visible', text.trim().length > 0);
  }

  /** Clean up the dashboard */
  public destroy(): void {
    this.panels.forEach(({ pane }) => pane.dispose());
    this.panels.clear();
    this.styleSheet.remove();
    this.root.remove();
  }

  private createRoot(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'aurora-dashboard';
    root.setAttribute('data-dock', this.dock);
    root.addEventListener('transitionend', () => {
      if (this.activePanelId) {
        const panel = this.panels.get(this.activePanelId);
        panel?.pane.refresh();
      }
    });
    return root;
  }

  private createTabRail(): HTMLDivElement {
    const rail = document.createElement('div');
    rail.className = 'aurora-tab-rail';
    rail.setAttribute('role', 'tablist');
    return rail;
  }

  private createTabList(): HTMLDivElement {
    const list = document.createElement('div');
    list.className = 'aurora-tab-list';
    return list;
  }

  private createPanelViewport(): HTMLDivElement {
    const viewport = document.createElement('div');
    viewport.className = 'aurora-panel-viewport';
    viewport.addEventListener('wheel', (event) => {
      if (this.collapsed) {
        event.preventDefault();
      }
    }, { passive: true });
    return viewport;
  }

  private createCollapseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aurora-collapse';
    button.setAttribute('aria-expanded', 'true');
    button.innerHTML = `
      <span class="aurora-collapse-icon">⤢</span>
      <span class="aurora-collapse-label">Collapse</span>
    `;
    button.addEventListener('click', () => this.toggleCollapse());
    return button;
  }

  private createDragHandle(): HTMLDivElement {
    const handle = document.createElement('div');
    handle.className = 'aurora-drag-handle';
    handle.title = 'Drag to dock on a different edge';
    handle.addEventListener('pointerdown', (event) => this.handleDragStart(event));
    return handle;
  }

  private createResizeHandle(): HTMLDivElement {
    const handle = document.createElement('div');
    handle.className = 'aurora-resize-handle';
    handle.title = 'Resize panel';
    handle.addEventListener('pointerdown', (event) => this.handleResizeStart(event));
    return handle;
  }

  private handleDragStart(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - this.root.getBoundingClientRect().left,
      offsetY: event.clientY - this.root.getBoundingClientRect().top,
    };
    this.root.classList.add('is-dragging');
    window.addEventListener('pointermove', this.handleDragMove);
    window.addEventListener('pointerup', this.handleDragEnd, { once: false });
  }

  private handleDragMove = (event: PointerEvent): void => {
    if (!this.dragState) return;
    const left = event.clientX - this.dragState.offsetX;
    const top = event.clientY - this.dragState.offsetY;
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.right = 'auto';
    this.root.style.bottom = 'auto';
    this.root.style.transform = '';
  };

  private handleDragEnd = (event: PointerEvent): void => {
    if (!this.dragState) return;
    this.root.classList.remove('is-dragging');
    window.removeEventListener('pointermove', this.handleDragMove);
    window.removeEventListener('pointerup', this.handleDragEnd);

    const { clientX, clientY } = event;
    this.dragState = null;
    this.snapToClosestEdge(clientX, clientY);
  };

  private snapToClosestEdge(x: number, y: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const distances: Record<DashboardDock, number> = {
      left: x,
      right: width - x,
      bottom: height - y,
    };

    const target = (Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0]) as DashboardDock;
    if (target === 'left' || target === 'right') {
      const rect = this.root.getBoundingClientRect();
      const top = clamp(y - rect.height * 0.25, 32, window.innerHeight - rect.height - 32);
      this.sideOffsetTop = top;
    }
    this.setDock(target);
  }

  private handleResizeStart(event: PointerEvent): void {
    event.preventDefault();
    this.resizeState = {
      pointerId: event.pointerId,
      startWidth: this.dock === 'bottom' ? this.bottomSize.width : this.sideSize.width,
      startHeight: this.dock === 'bottom' ? this.bottomSize.height : this.sideSize.height,
      startX: event.clientX,
      startY: event.clientY,
    };
    this.root.classList.add('is-resizing');
    window.addEventListener('pointermove', this.handleResizeMove);
    window.addEventListener('pointerup', this.handleResizeEnd, { once: false });
  }

  private handleResizeMove = (event: PointerEvent): void => {
    if (!this.resizeState) return;
    const dx = event.clientX - this.resizeState.startX;
    const dy = event.clientY - this.resizeState.startY;

    if (this.dock === 'bottom') {
      const widthLimits = this.bottomSizeLimits.width;
      const heightLimits = this.bottomSizeLimits.height;
      const width = clamp(this.resizeState.startWidth + dx, widthLimits[0], Math.min(widthLimits[1], window.innerWidth - 80));
      const height = clamp(this.resizeState.startHeight - dy, heightLimits[0], heightLimits[1]);
      this.bottomSize.width = width;
      this.bottomSize.height = height;
    } else if (this.dock === 'right') {
      const widthLimits = this.sideSizeLimits.width;
      const heightLimits = this.sideSizeLimits.height;
      const width = clamp(this.resizeState.startWidth - dx, widthLimits[0], widthLimits[1]);
      const height = clamp(this.resizeState.startHeight + dy, heightLimits[0], Math.min(heightLimits[1], window.innerHeight - 120));
      this.sideSize.width = width;
      this.sideSize.height = height;
    } else {
      const widthLimits = this.sideSizeLimits.width;
      const heightLimits = this.sideSizeLimits.height;
      const width = clamp(this.resizeState.startWidth + dx, widthLimits[0], widthLimits[1]);
      const height = clamp(this.resizeState.startHeight + dy, heightLimits[0], Math.min(heightLimits[1], window.innerHeight - 120));
      this.sideSize.width = width;
      this.sideSize.height = height;
    }

    this.applyDock(this.dock);
  };

  private handleResizeEnd = (): void => {
    this.root.classList.remove('is-resizing');
    window.removeEventListener('pointermove', this.handleResizeMove);
    window.removeEventListener('pointerup', this.handleResizeEnd);
    this.resizeState = null;
  };

  private applyDock(dock: DashboardDock): void {
    this.root.dataset.dock = dock;
    this.root.classList.remove('dock-left', 'dock-right', 'dock-bottom');
    this.root.classList.add(`dock-${dock}`);

    if (dock === 'left') {
      this.root.style.left = `${this.sideInset}px`;
      this.root.style.right = 'auto';
      this.root.style.bottom = 'auto';
      this.root.style.top = `${this.sideOffsetTop}px`;
      this.root.style.width = `${this.sideSize.width}px`;
      this.root.style.height = `${this.sideSize.height}px`;
      this.root.style.transform = '';
    } else if (dock === 'right') {
      this.root.style.right = `${this.sideInset}px`;
      this.root.style.left = 'auto';
      this.root.style.bottom = 'auto';
      this.root.style.top = `${this.sideOffsetTop}px`;
      this.root.style.width = `${this.sideSize.width}px`;
      this.root.style.height = `${this.sideSize.height}px`;
      this.root.style.transform = '';
    } else {
      this.root.style.left = '50%';
      this.root.style.right = 'auto';
      this.root.style.bottom = '24px';
      this.root.style.top = 'auto';
      this.root.style.width = `${this.bottomSize.width}px`;
      this.root.style.height = `${this.bottomSize.height}px`;
      this.root.style.transform = 'translateX(-50%)';
    }

    this.updateTabOrientation();
    if (this.activePanelId) {
      this.panels.get(this.activePanelId)?.pane.refresh();
    }
  }

  private updateTabOrientation(): void {
    this.tabRail.dataset.orientation = this.dock === 'bottom' ? 'horizontal' : 'vertical';
  }

  private applyThemeVariables(): void {
    const rootStyle = this.root.style;
    const theme = this.theme;
    const accentHsl = hexToHsl(theme.accent);
    const accentRgb = hexToRgb(theme.accent);

    const backgroundHue = theme.backgroundHue;
    const backgroundSat = clamp(theme.backgroundSaturation, 0, 1);
    const baseLight = clamp(theme.backgroundLightness, 0, 1);

    const topColor = hslToCss(backgroundHue - 6, backgroundSat * 100, clamp(baseLight + 0.12, 0, 1) * 100, theme.glassOpacity);
    const bottomColor = hslToCss(backgroundHue + 10, clamp(backgroundSat + 0.05, 0, 1) * 100, clamp(baseLight - 0.04, 0, 1) * 100, theme.glassOpacity + 0.05);
    const railColor = hslToCss(backgroundHue - 12, backgroundSat * 100, clamp(baseLight - 0.06, 0, 1) * 100, clamp(theme.glassOpacity + 0.08, 0, 1));

    const borderColor = hslToCss(backgroundHue + 8, backgroundSat * 100, clamp(baseLight + 0.32, 0, 1) * 100, 0.38);
    const highlightColor = hslToCss(accentHsl.h, accentHsl.s, clamp(accentHsl.l + theme.highlightStrength * 20, 0, 100), 0.45);
    const textPrimary = hslToCss(backgroundHue, 32, mix(92, 72, theme.textBrightness), 0.98);
    const textSecondary = hslToCss(backgroundHue - 4, 24, mix(80, 60, theme.textBrightness), 0.72);

    const accent = `hsl(${accentHsl.h}, ${accentHsl.s}%, ${accentHsl.l}%)`;
    const accentSoft = `hsla(${accentHsl.h}, ${Math.min(100, accentHsl.s + 10)}%, ${Math.min(95, accentHsl.l + 18)}%, 0.5)`;
    const accentGlow = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.18 * theme.shadowStrength})`;

    const shadowPrimary = `0 24px 60px rgba(8, 12, 28, ${0.46 * theme.shadowStrength})`;
    const shadowAccent = `0 12px 32px ${accentGlow}`;
    const insetShadow = `inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.08)`;

    rootStyle.setProperty('--aurora-accent', accent);
    rootStyle.setProperty('--aurora-accent-soft', accentSoft);
    rootStyle.setProperty('--aurora-accent-text', accentHsl.l > 55 ? '#0b132b' : '#f6fbff');
    rootStyle.setProperty('--aurora-surface-top', topColor);
    rootStyle.setProperty('--aurora-surface-bottom', bottomColor);
    rootStyle.setProperty('--aurora-rail-bg', railColor);
    rootStyle.setProperty('--aurora-border', borderColor);
    rootStyle.setProperty('--aurora-highlight', highlightColor);
    rootStyle.setProperty('--aurora-text-primary', textPrimary);
    rootStyle.setProperty('--aurora-text-secondary', textSecondary);
    rootStyle.setProperty('--aurora-glass-blur', `${theme.glassBlur}px`);
    rootStyle.setProperty('--aurora-glass-saturation', `${theme.glassSaturation * 100}%`);
    rootStyle.setProperty('--aurora-glass-brightness', `${theme.glassBrightness * 100}%`);
    rootStyle.setProperty('--aurora-radius', `${theme.radius}px`);
    rootStyle.setProperty('--aurora-shadow', `${shadowPrimary}, ${shadowAccent}, ${insetShadow}`);
    rootStyle.setProperty('--aurora-inset-shadow', insetShadow);
  }

  private loadPersistedTheme(): DashboardTheme | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DashboardTheme;
      return { ...DEFAULT_THEME, ...parsed };
    } catch (error) {
      console.warn('[Dashboard] Failed to load theme from storage', error);
      return null;
    }
  }

  private persistTheme(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.theme));
    } catch (error) {
      console.warn('[Dashboard] Failed to persist theme', error);
    }
  }

  private injectStyles(): HTMLStyleElement {
    const existing = document.getElementById('aurora-dashboard-styles');
    if (existing) {
      existing.remove();
    }

    const style = document.createElement('style');
    style.id = 'aurora-dashboard-styles';
    style.textContent = `
      :root {
        color-scheme: dark;
      }

      .aurora-dashboard {
        position: fixed;
        top: 96px;
        right: 24px;
        display: flex;
        gap: 14px;
        z-index: 3000;
        align-items: stretch;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1),
          opacity 0.25s ease;
        will-change: transform, opacity;
        pointer-events: auto;
      }

      .aurora-dashboard.is-dragging {
        transition: none;
        cursor: grabbing;
      }

      .aurora-dashboard.is-resizing {
        user-select: none;
      }

      .aurora-dashboard.is-collapsed .aurora-panel-viewport {
        width: 0;
        opacity: 0;
        pointer-events: none;
        margin-right: 0;
      }

      .aurora-dashboard.is-collapsed .aurora-resize-handle {
        opacity: 0;
        pointer-events: none;
      }

      .aurora-tab-rail {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 16px;
        background: var(--aurora-rail-bg, rgba(22, 32, 64, 0.72));
        backdrop-filter: blur(calc(var(--aurora-glass-blur, 40px) * 0.66)) saturate(var(--aurora-glass-saturation, 220%));
        border-radius: calc(var(--aurora-radius, 20px) * 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 12px 36px rgba(6, 10, 24, 0.45);
        padding: 18px 12px;
      }

      .aurora-tab-rail[data-orientation="horizontal"] {
        flex-direction: row;
        align-items: center;
        padding: 12px 18px;
      }

      .aurora-drag-handle {
        width: 32px;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08));
        align-self: center;
        cursor: grab;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .aurora-drag-handle:hover {
        transform: translateY(-2px);
      }

      .aurora-tab-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .aurora-tab-rail[data-orientation="horizontal"] .aurora-tab-list {
        flex-direction: row;
      }

      .aurora-tab {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: var(--aurora-text-secondary, rgba(230, 240, 255, 0.7));
        background: transparent;
        border: none;
        border-radius: 16px;
        padding: 10px 14px;
        cursor: pointer;
        transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
        text-align: left;
      }

      .aurora-tab::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0));
        opacity: 0;
        transition: opacity 0.25s ease;
      }

      .aurora-tab .aurora-tab-icon {
        font-size: 16px;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
      }

      .aurora-tab .aurora-tab-badge {
        margin-left: auto;
        padding: 0 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: var(--aurora-text-primary, #f5f8ff);
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .aurora-tab .aurora-tab-badge.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .aurora-tab:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--aurora-text-primary, #f5f8ff);
      }

      .aurora-tab:hover::after {
        opacity: 0.35;
      }

      .aurora-tab.is-active {
        background: linear-gradient(135deg, var(--aurora-accent-soft, rgba(125, 211, 255, 0.3)), rgba(255,255,255,0.04));
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.15);
        color: var(--aurora-accent-text, #0b132b);
        transform: translateX(2px);
      }

      .aurora-tab.is-active::after {
        opacity: 0.4;
      }

      .aurora-collapse {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--aurora-text-secondary, rgba(230, 240, 255, 0.65));
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        cursor: pointer;
        transition: background 0.25s ease, color 0.25s ease;
      }

      .aurora-collapse:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--aurora-text-primary, #f5f8ff);
      }

      .aurora-dashboard.is-collapsed .aurora-collapse {
        background: rgba(255, 255, 255, 0.14);
        color: var(--aurora-accent-text, #0b132b);
      }

      .aurora-panel-viewport {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: stretch;
        border-radius: var(--aurora-radius, 20px);
        box-shadow: var(--aurora-shadow, 0 20px 50px rgba(8, 12, 28, 0.5));
        overflow: hidden;
        transition: width 0.3s ease, opacity 0.3s ease;
        background: linear-gradient(135deg, var(--aurora-surface-top, rgba(28,40,72,0.76)), var(--aurora-surface-bottom, rgba(18,26,52,0.84)));
        backdrop-filter: blur(var(--aurora-glass-blur, 42px)) saturate(var(--aurora-glass-saturation, 210%)) brightness(var(--aurora-glass-brightness, 112%));
        border: 1px solid var(--aurora-border, rgba(255,255,255,0.25));
      }

      .aurora-panel-page {
        flex: 1;
        display: none;
        padding: 12px 16px 18px;
        overflow-y: auto;
        scrollbar-width: thin;
      }

      .aurora-panel-page.is-active {
        display: block;
      }

      .aurora-panel-page::-webkit-scrollbar {
        width: 6px;
      }

      .aurora-panel-page::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 999px;
      }

      .aurora-resize-handle {
        position: absolute;
        right: 18px;
        bottom: 14px;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: linear-gradient(135deg, rgba(255,255,255,0.38), rgba(255,255,255,0.08));
        opacity: 0.55;
        cursor: nwse-resize;
        transition: opacity 0.2s ease;
        pointer-events: auto;
      }

      .aurora-resize-handle:hover {
        opacity: 1;
      }

      .aurora-dashboard.dock-bottom .aurora-tab-rail {
        align-self: stretch;
      }

      .aurora-dashboard.dock-bottom .aurora-resize-handle {
        right: 22px;
        bottom: 18px;
      }

      .aurora-dashboard.dock-bottom .aurora-panel-viewport {
        min-height: 260px;
      }

      /* Tweakpane harmonisation */
      .aurora-panel-viewport .tp-dfwv,
      .aurora-panel-viewport .tp-rotv {
        background: transparent !important;
        box-shadow: none !important;
      }

      .aurora-panel-viewport .tp-fldv {
        border-radius: 16px !important;
        background: rgba(12, 18, 38, 0.38);
        border: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 12px;
      }

      .aurora-panel-viewport .tp-fldv_t {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--aurora-text-secondary, rgba(230, 240, 255, 0.7));
        padding: 12px 16px !important;
        background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0));
      }

      .aurora-panel-viewport .tp-fldv_t::before {
        display: none;
      }

      .aurora-panel-viewport .tp-rotv_v {
        color: var(--aurora-text-primary, #f5f8ff);
      }

      .aurora-panel-viewport .tp-btnv {
        border-radius: 12px;
        background: linear-gradient(135deg, var(--aurora-accent-soft, rgba(125, 211, 255, 0.3)), rgba(255,255,255,0.06));
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: var(--aurora-accent-text, #0b132b);
        font-weight: 600;
      }

      .aurora-panel-viewport .tp-btnv:hover {
        background: linear-gradient(135deg, var(--aurora-accent, #7dd3ff), rgba(255,255,255,0.2));
      }

      .aurora-panel-viewport .tp-lstv {
        border-radius: 12px;
        background: rgba(12, 18, 38, 0.46);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .aurora-panel-viewport .tp-rotv {
        color: var(--aurora-text-primary, #f5f8ff);
      }

      .aurora-panel-viewport .tp-grdv {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
      }

      @media (max-width: 1280px) {
        .aurora-dashboard {
          transform-origin: top right;
          scale: 0.92;
        }
      }
    `;

    document.head.appendChild(style);
    return style;
  }

  private createPerformancePanel(): void {
    const pane = this.registerPanel({
      id: 'performance',
      title: 'Performance',
      icon: '⏱️',
      description: 'Real-time FPS metrics',
    });
    const fps = pane.addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      lineCount: 2,
    }) as unknown as FpsGraphBladeApi;
    this.fpsGraph = fps;
  }

  private createInfoPanel(): void {
    const pane = this.registerPanel({
      id: 'about',
      title: 'About',
      icon: '🧭',
      description: 'System overview',
    });

    const info = pane.addFolder({ title: 'Aurora Control Surface', expanded: true });
    info.addMonitor({ version: '1.0', build: 'adaptive-dashboard' }, 'version', { label: 'Version' });
    info.addMonitor({ build: 'adaptive-dashboard' }, 'build', { label: 'Build' });
  }
}

export { DEFAULT_THEME };
