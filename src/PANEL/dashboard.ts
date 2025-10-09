/**
 * PANEL/dashboard.ts - Unified adaptive dashboard with vertical tab navigation
 * Provides ultra glassmorphism styling, docking, collapse transitions, and theme pipeline
 * Version: 2.0 Ultra Glassmorphism Edition
 */

import { Pane } from 'tweakpane';
import type { TpPluginBundle } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import * as InfodumpPlugin from 'tweakpane-plugin-infodump';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';

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
  accent: '#8be9ff',
  backgroundHue: 226,
  backgroundSaturation: 0.5,
  backgroundLightness: 0.18,
  glassOpacity: 0.85,
  glassBlur: 64,
  glassSaturation: 2.8,
  glassBrightness: 1.28,
  radius: 28,
  shadowStrength: 0.92,
  highlightStrength: 0.88,
  textBrightness: 0.95,
};

const THEME_STORAGE_KEY = 'aurora.dashboard.theme.default';

const ESSENTIALS_BUNDLE = EssentialsPlugin as unknown as TpPluginBundle;
const INFODUMP_BUNDLE = InfodumpPlugin as unknown as TpPluginBundle;

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
  private handleWindowResize = (): void => {
    if (typeof window === 'undefined') return;

    if (this.dock === 'bottom') {
      const widthLimits = this.bottomSizeLimits.width;
      const heightLimits = this.bottomSizeLimits.height;
      const maxWidth = Math.max(widthLimits[0], Math.min(widthLimits[1], window.innerWidth - 80));
      const maxHeight = Math.max(heightLimits[0], Math.min(heightLimits[1], window.innerHeight - 160));
      this.bottomSize.width = clamp(this.bottomSize.width, widthLimits[0], maxWidth);
      this.bottomSize.height = clamp(this.bottomSize.height, heightLimits[0], maxHeight);
    } else {
      const widthLimits = this.sideSizeLimits.width;
      const heightLimits = this.sideSizeLimits.height;
      const maxWidth = Math.max(widthLimits[0], Math.min(widthLimits[1], window.innerWidth - 120));
      const maxHeight = Math.max(heightLimits[0], Math.min(heightLimits[1], window.innerHeight - 120));
      this.sideSize.width = clamp(this.sideSize.width, widthLimits[0], maxWidth);
      this.sideSize.height = clamp(this.sideSize.height, heightLimits[0], maxHeight);
      const maxTop = Math.max(32, window.innerHeight - this.sideSize.height - 32);
      this.sideOffsetTop = clamp(this.sideOffsetTop, 32, maxTop);
    }

    this.applyDock(this.dock);
  };

  constructor(options: DashboardOptions = {}) {
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
    
    // Ensure visibility with inline critical styles
    this.root.style.position = 'fixed';
    this.root.style.display = 'flex';
    this.root.style.zIndex = '3000';
    
    console.log('[Dashboard] Root appended. Visible:', this.root.offsetWidth > 0, 'x', this.root.offsetHeight > 0);

    this.applyDock(this.dock);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleWindowResize, { passive: true });
      this.setupKeyboardShortcuts();
    }
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

  /** Setup keyboard shortcuts for dashboard control */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // C key: Toggle collapse/expand
      if (event.key === 'c' || event.key === 'C') {
        // Don't trigger if user is typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        event.preventDefault();
        this.toggleCollapse();
        console.log('[Dashboard] Keyboard shortcut: Toggle collapse');
      }
      
      // ESC key: Collapse (close) the dashboard
      if (event.key === 'Escape') {
        if (!this.collapsed) {
          event.preventDefault();
          this.collapse();
          console.log('[Dashboard] Keyboard shortcut: Collapse (ESC)');
        }
      }
    }, { passive: false });
  }

  private configurePane(pane: Pane): void {
    pane.registerPlugin(ESSENTIALS_BUNDLE);
    pane.registerPlugin(INFODUMP_BUNDLE);
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
    this.configurePane(pane);
    pane.element.classList.add('aurora-pane');
    pane.element.setAttribute('data-panel-id', options.id);

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
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize);
    }
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
    
    // Ensure position is always fixed
    this.root.style.position = 'fixed';

    let appliedWidth = this.sideSize.width;
    let appliedHeight = this.sideSize.height;

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
      appliedWidth = this.bottomSize.width;
      appliedHeight = this.bottomSize.height;
    }

    this.updateShellMetrics(appliedWidth, appliedHeight);

    this.updateTabOrientation();
    if (this.activePanelId) {
      this.panels.get(this.activePanelId)?.pane.refresh();
    }
  }

  private updateShellMetrics(width: number, height: number): void {
    this.root.style.setProperty('--aurora-shell-width', `${Math.round(width)}px`);
    this.root.style.setProperty('--aurora-shell-height', `${Math.round(height)}px`);
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
      return null;
    }
  }

  private persistTheme(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.theme));
    } catch (error) {
      // Ignore persistence errors
    }
  }

  private injectStyles(): HTMLStyleElement {
    // Remove all existing aurora dashboard styles (even with different IDs)
    const existingStyles = document.querySelectorAll('style[id^="aurora-dashboard-styles"]');
    existingStyles.forEach(el => el.remove());

    const style = document.createElement('style');
    style.id = `aurora-dashboard-styles-${Date.now()}`;
    style.setAttribute('data-version', '2.0-ultra');
    style.textContent = `
      :root {
        color-scheme: dark;
      }

      .aurora-dashboard {
        --aurora-ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
        --aurora-ease-soft: cubic-bezier(0.45, 0.05, 0.24, 1);
        --aurora-ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
        --aurora-ease-smooth: cubic-bezier(0.33, 1, 0.68, 1);
        position: fixed;
        top: 96px;
        right: 24px;
        width: var(--aurora-shell-width, 380px);
        height: var(--aurora-shell-height, 640px);
        display: flex;
        gap: 18px;
        padding: 14px;
        align-items: stretch;
        border-radius: calc(var(--aurora-radius, 28px) + 12px);
        z-index: 3000;
        pointer-events: auto;
        will-change: transform, opacity, filter, backdrop-filter;
        transition: 
          transform 0.55s var(--aurora-ease-spring), 
          opacity 0.4s var(--aurora-ease-smooth), 
          filter 0.4s var(--aurora-ease-smooth);
        transform-origin: top right;
      }

      .aurora-dashboard::before,
      .aurora-dashboard::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
      }

      .aurora-dashboard::before {
        background: linear-gradient(145deg, var(--aurora-surface-top, rgba(18, 28, 52, 0.92)), var(--aurora-surface-bottom, rgba(8, 14, 28, 0.98)));
        border: 2px solid var(--aurora-border, rgba(255, 255, 255, 0.22));
        box-shadow: var(--aurora-shadow, 
          0 12px 48px rgba(0, 0, 0, 0.45),
          0 36px 84px rgba(0, 0, 0, 0.35),
          inset 0 0 0 1px rgba(255, 255, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.15)
        );
        backdrop-filter: blur(var(--aurora-glass-blur, 64px)) saturate(var(--aurora-glass-saturation, 280%)) brightness(var(--aurora-glass-brightness, 128%));
        -webkit-backdrop-filter: blur(var(--aurora-glass-blur, 64px)) saturate(var(--aurora-glass-saturation, 280%)) brightness(var(--aurora-glass-brightness, 128%));
        opacity: 0.99;
        transition: backdrop-filter 0.4s ease, opacity 0.3s ease;
      }

      .aurora-dashboard::after {
        background: 
          radial-gradient(160% 140% at 20% 0%, rgba(139, 233, 255, 0.16), transparent 50%),
          radial-gradient(140% 140% at 80% 100%, rgba(139, 233, 255, 0.22), transparent 65%),
          radial-gradient(120% 120% at 50% 50%, rgba(255, 255, 255, 0.06), transparent),
          linear-gradient(135deg, rgba(139, 233, 255, 0.05), transparent 60%);
        mix-blend-mode: screen;
        opacity: 0.75;
        transition: opacity 0.4s ease;
      }

      .aurora-dashboard > * {
        position: relative;
        z-index: 1;
        pointer-events: auto;
      }

      .aurora-dashboard.is-dragging {
        transition: none;
        filter: brightness(1.05);
        cursor: grabbing;
      }

      .aurora-dashboard.is-resizing {
        user-select: none;
      }

      .aurora-dashboard.is-collapsed {
        opacity: 0.85;
        filter: saturate(0.9) brightness(0.95);
        transform: scale(0.97) translateX(8px);
      }

      .aurora-dashboard.is-collapsed::before {
        opacity: 0.88;
        backdrop-filter: blur(calc(var(--aurora-glass-blur, 64px) * 0.6)) saturate(calc(var(--aurora-glass-saturation, 280%) * 0.75));
        -webkit-backdrop-filter: blur(calc(var(--aurora-glass-blur, 64px) * 0.6)) saturate(calc(var(--aurora-glass-saturation, 280%) * 0.75));
      }
      
      .aurora-dashboard.is-collapsed::after {
        opacity: 0.45;
      }

      .aurora-dashboard.is-collapsed .aurora-panel-viewport {
        max-width: 0;
        flex: 0 0 0;
        width: 0;
        opacity: 0;
        pointer-events: none;
        margin-right: 0;
        transform: translateX(24px) scale(0.94);
        filter: blur(4px);
      }

      .aurora-dashboard.is-collapsed .aurora-resize-handle {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.2) rotate(45deg);
      }
      
      .aurora-dashboard.is-collapsed .aurora-tab-rail {
        transform: scale(0.98);
      }
      
      .aurora-dashboard.is-collapsed .aurora-tab-rail::after {
        opacity: 0.5;
      }
      
      .aurora-dashboard.is-collapsed .aurora-tab {
        transform: translateX(0) !important;
      }

      .aurora-tab-rail {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 22px;
        padding: 22px 16px;
        min-width: 120px;
        border-radius: calc(var(--aurora-radius, 28px) * 0.9);
        background: linear-gradient(165deg, rgba(8, 16, 36, 0.65), rgba(4, 10, 24, 0.75));
        backdrop-filter: blur(calc(var(--aurora-glass-blur, 64px) * 0.65)) saturate(calc(var(--aurora-glass-saturation, 280%) * 0.98));
        -webkit-backdrop-filter: blur(calc(var(--aurora-glass-blur, 64px) * 0.65)) saturate(calc(var(--aurora-glass-saturation, 280%) * 0.98));
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        box-shadow: 
          inset 0 1px 2px rgba(255, 255, 255, 0.18),
          inset 0 -1px 2px rgba(0, 0, 0, 0.25),
          0 16px 40px rgba(0, 0, 0, 0.65),
          0 4px 12px rgba(0, 0, 0, 0.4);
        transition: all 0.45s var(--aurora-ease-spring), transform 0.3s var(--aurora-ease-smooth);
        will-change: transform;
      }

      .aurora-tab-rail::after {
        content: '';
        position: absolute;
        inset: 10px;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(165deg, 
          rgba(255, 255, 255, 0.12) 0%, 
          rgba(139, 233, 255, 0.08) 25%, 
          rgba(255, 255, 255, 0.04) 50%, 
          transparent 100%);
        opacity: 0.85;
        transition: opacity 0.45s ease;
      }

      .aurora-tab-rail[data-orientation="horizontal"] {
        flex-direction: row;
        align-items: center;
        min-height: 90px;
        padding: 14px 20px;
      }

      .aurora-drag-handle {
        width: 38px;
        height: 8px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.12));
        align-self: center;
        cursor: grab;
        transition: transform 0.25s var(--aurora-ease-soft), opacity 0.2s ease;
      }

      .aurora-drag-handle:hover {
        transform: translateY(-2px);
      }

      .aurora-tab-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .aurora-tab-rail[data-orientation="horizontal"] .aurora-tab-list {
        flex-direction: row;
      }

      .aurora-tab {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        font-size: 13.5px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--aurora-text-secondary, rgba(210, 230, 255, 0.68));
        background: transparent;
        border: none;
        border-radius: 20px;
        padding: 15px 20px;
        cursor: pointer;
        transition: 
          color 0.4s var(--aurora-ease-smooth),
          transform 0.5s var(--aurora-ease-spring),
          background 0.4s var(--aurora-ease-smooth);
        isolation: isolate;
        will-change: transform, color, background;
      }

      .aurora-tab::before,
      .aurora-tab::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        transition: 
          opacity 0.45s var(--aurora-ease-smooth),
          transform 0.5s var(--aurora-ease-spring);
      }

      .aurora-tab::before {
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.1), 
          rgba(139, 233, 255, 0.04),
          rgba(255, 255, 255, 0.02));
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.18),
          inset 0 0 12px rgba(139, 233, 255, 0.08);
        opacity: 0;
      }

      .aurora-tab::after {
        background: radial-gradient(150% 130% at 0% 50%, 
          rgba(139, 233, 255, 0.5), 
          rgba(139, 233, 255, 0.25) 40%, 
          transparent 70%);
        opacity: 0;
        transform: translateX(-16px) scale(0.88);
        filter: blur(8px);
      }

      .aurora-tab:hover {
        color: var(--aurora-text-primary, #f8fcff);
        transform: translateX(4px) scale(1.01);
        background: rgba(255, 255, 255, 0.04);
      }

      .aurora-tab:hover::before {
        opacity: 0.6;
        transform: scale(1.02);
      }

      .aurora-tab:hover::after {
        opacity: 0.7;
        transform: translateX(0) scale(1);
      }

      .aurora-tab.is-active {
        color: var(--aurora-accent-text, #f8fcff);
        background: linear-gradient(135deg, 
          rgba(139, 233, 255, 0.12), 
          rgba(139, 233, 255, 0.06));
        transform: translateX(6px) scale(1.03);
      }

      .aurora-tab.is-active::before {
        opacity: 1;
        background: linear-gradient(135deg, 
          var(--aurora-accent-soft, rgba(139, 233, 255, 0.28)), 
          rgba(139, 233, 255, 0.12),
          rgba(139, 233, 255, 0.08));
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 0 24px rgba(139, 233, 255, 0.25),
          0 14px 32px rgba(0, 0, 0, 0.45),
          0 6px 16px rgba(139, 233, 255, 0.15);
        transform: scale(1);
      }

      .aurora-tab.is-active::after {
        opacity: 0.9;
        transform: translateX(0) scale(1.08);
        filter: blur(10px);
      }

      .aurora-tab .aurora-tab-icon {
        font-size: 16px;
        filter: drop-shadow(0 6px 16px rgba(8, 12, 28, 0.5));
      }

      .aurora-tab .aurora-tab-badge {
        margin-left: auto;
        padding: 2px 9px;
        font-size: 11px;
        font-weight: 700;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        color: var(--aurora-text-primary, #f6fbff);
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.22s ease, transform 0.22s ease;
      }

      .aurora-tab .aurora-tab-badge.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .aurora-collapse {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--aurora-text-secondary, rgba(223, 235, 255, 0.7));
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        cursor: pointer;
        transition: background 0.3s var(--aurora-ease-soft), color 0.3s ease, transform 0.3s var(--aurora-ease-soft);
      }

      .aurora-collapse:hover {
        background: rgba(255, 255, 255, 0.16);
        color: var(--aurora-text-primary, #f6fbff);
        transform: translateY(-1px);
      }

      .aurora-dashboard.is-collapsed .aurora-collapse {
        background: rgba(255, 255, 255, 0.22);
        color: var(--aurora-accent-text, #041024);
      }

      .aurora-panel-viewport {
        position: relative;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: stretch;
        border-radius: calc(var(--aurora-radius, 28px) + 2px);
        overflow: hidden;
        transition: 
          max-width 0.4s var(--aurora-ease-spring), 
          opacity 0.4s var(--aurora-ease-smooth), 
          transform 0.4s var(--aurora-ease-spring),
          filter 0.3s ease;
        box-shadow: 
          0 28px 68px rgba(8, 12, 28, 0.58),
          0 12px 32px rgba(0, 0, 0, 0.45),
          inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        will-change: opacity, transform;
      }

      .aurora-panel-viewport::before,
      .aurora-panel-viewport::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
      }

      .aurora-panel-viewport::before {
        background: linear-gradient(135deg, 
          var(--aurora-surface-top, rgba(28, 42, 74, 0.88)), 
          var(--aurora-surface-bottom, rgba(14, 20, 38, 0.96)));
        border: 1.5px solid var(--aurora-border, rgba(255, 255, 255, 0.25));
        backdrop-filter: blur(var(--aurora-glass-blur, 64px)) saturate(var(--aurora-glass-saturation, 280%)) brightness(var(--aurora-glass-brightness, 128%));
        -webkit-backdrop-filter: blur(var(--aurora-glass-blur, 64px)) saturate(var(--aurora-glass-saturation, 280%)) brightness(var(--aurora-glass-brightness, 128%));
        transition: backdrop-filter 0.4s ease, opacity 0.3s ease;
      }

      .aurora-panel-viewport::after {
        background: linear-gradient(160deg, 
          rgba(255, 255, 255, 0.28), 
          rgba(139, 233, 255, 0.12) 35%, 
          rgba(255, 255, 255, 0) 60%);
        opacity: 0.62;
        mix-blend-mode: screen;
        transition: opacity 0.4s ease;
      }

      .aurora-panel-viewport > * {
        position: relative;
        z-index: 1;
      }

      .aurora-panel-page {
        flex: 1;
        display: none;
        padding: 16px 18px 22px;
        overflow-y: auto;
        scrollbar-width: thin;
      }

      .aurora-panel-page.is-active {
        display: block;
        animation: aurora-page-fade 0.4s var(--aurora-ease-soft);
      }

      .aurora-panel-page::-webkit-scrollbar {
        width: 8px;
      }

      .aurora-panel-page::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 999px;
      }

      .aurora-resize-handle {
        position: absolute;
        right: 18px;
        bottom: 18px;
        width: 18px;
        height: 18px;
        border-radius: 6px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.08));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
        opacity: 0.7;
        cursor: nwse-resize;
        transition: opacity 0.25s ease, transform 0.3s var(--aurora-ease-soft);
        pointer-events: auto;
      }

      .aurora-resize-handle::after {
        content: '';
        position: absolute;
        inset: 4px;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), transparent);
        opacity: 0.7;
      }

      .aurora-resize-handle:hover {
        opacity: 1;
        transform: scale(1.1);
      }

      .aurora-dashboard.dock-bottom .aurora-tab-rail {
        align-self: stretch;
      }

      .aurora-dashboard.dock-bottom .aurora-resize-handle {
        right: 22px;
        bottom: 22px;
      }

      .aurora-dashboard.dock-bottom .aurora-panel-viewport {
        min-height: 260px;
      }

      /* Tweakpane refinements - Enhanced glassmorphism */
      .aurora-panel-viewport .tp-dfwv,
      .aurora-panel-viewport .tp-rotv {
        background: transparent !important;
        box-shadow: none !important;
      }

      .aurora-panel-viewport .tp-tstv {
        color: var(--aurora-text-secondary, rgba(223, 235, 255, 0.75));
        font-weight: 500;
      }

      .aurora-panel-viewport .tp-fldv {
        border-radius: 20px !important;
        background: linear-gradient(135deg, 
          rgba(10, 18, 36, 0.5), 
          rgba(8, 14, 28, 0.55));
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 16px;
        box-shadow: 
          inset 0 1px 2px rgba(255, 255, 255, 0.15),
          inset 0 0 20px rgba(139, 233, 255, 0.03),
          0 4px 16px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: all 0.3s ease;
      }
      
      .aurora-panel-viewport .tp-fldv:hover {
        border-color: rgba(255, 255, 255, 0.14);
        box-shadow: 
          inset 0 1px 2px rgba(255, 255, 255, 0.18),
          inset 0 0 24px rgba(139, 233, 255, 0.05),
          0 6px 20px rgba(0, 0, 0, 0.4);
      }

      .aurora-panel-viewport .tp-fldv_t {
        font-size: 13.5px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--aurora-text-secondary, rgba(223, 235, 255, 0.78));
        padding: 13px 20px !important;
        background: linear-gradient(100deg, 
          rgba(255, 255, 255, 0.1), 
          rgba(139, 233, 255, 0.04),
          rgba(255, 255, 255, 0.02));
        border-radius: 18px 18px 0 0;
        transition: color 0.3s ease, background 0.3s ease;
      }
      
      .aurora-panel-viewport .tp-fldv_t:hover {
        color: var(--aurora-text-primary, #f6fbff);
        background: linear-gradient(100deg, 
          rgba(255, 255, 255, 0.14), 
          rgba(139, 233, 255, 0.06),
          rgba(255, 255, 255, 0.04));
      }

      .aurora-panel-viewport .tp-fldv_t::before {
        display: none;
      }

      .aurora-panel-viewport .tp-rotv_v {
        color: var(--aurora-text-primary, #f6fbff);
        font-weight: 500;
      }

      .aurora-panel-viewport .tp-btnv {
        border-radius: 16px;
        background: linear-gradient(135deg, 
          var(--aurora-accent-soft, rgba(139, 233, 255, 0.4)), 
          rgba(139, 233, 255, 0.25),
          rgba(255, 255, 255, 0.12));
        border: 1.5px solid rgba(255, 255, 255, 0.25);
        color: var(--aurora-accent-text, #041024);
        font-weight: 600;
        font-size: 13px;
        padding: 10px 16px !important;
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          0 6px 16px rgba(139, 233, 255, 0.15),
          0 2px 8px rgba(0, 0, 0, 0.25);
        transition: 
          transform 0.3s var(--aurora-ease-spring), 
          box-shadow 0.3s var(--aurora-ease-smooth),
          background 0.3s ease;
      }

      .aurora-panel-viewport .tp-btnv:hover {
        transform: translateY(-2px) scale(1.02);
        background: linear-gradient(135deg, 
          var(--aurora-accent-soft, rgba(139, 233, 255, 0.5)), 
          rgba(139, 233, 255, 0.32),
          rgba(255, 255, 255, 0.16));
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.35),
          0 12px 32px rgba(139, 233, 255, 0.25),
          0 6px 16px rgba(0, 0, 0, 0.3);
      }
      
      .aurora-panel-viewport .tp-btnv:active {
        transform: translateY(0) scale(0.98);
      }

      .aurora-panel-viewport .tp-lstv {
        border-radius: 16px;
        background: linear-gradient(135deg, 
          rgba(8, 16, 32, 0.65), 
          rgba(6, 12, 24, 0.7));
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        box-shadow: 
          inset 0 1px 1px rgba(255, 255, 255, 0.1),
          0 4px 12px rgba(0, 0, 0, 0.3);
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }
      
      .aurora-panel-viewport .tp-lstv:hover {
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 
          inset 0 1px 1px rgba(255, 255, 255, 0.12),
          0 6px 16px rgba(0, 0, 0, 0.35);
      }

      .aurora-panel-viewport .tp-rotv {
        color: var(--aurora-text-primary, #f6fbff);
        font-weight: 500;
      }

      .aurora-panel-viewport .tp-grdv {
        background: linear-gradient(135deg, 
          rgba(255, 255, 255, 0.14), 
          rgba(139, 233, 255, 0.08));
        border-radius: 14px;
        box-shadow: 
          inset 0 1px 1px rgba(255, 255, 255, 0.2),
          0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .aurora-panel-viewport .tp-swv {
        color: var(--aurora-text-secondary, rgba(223, 235, 255, 0.75));
        font-weight: 500;
      }
      
      .aurora-panel-viewport .tp-txtv {
        border-radius: 12px;
        background: rgba(8, 16, 32, 0.6);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }
      
      .aurora-panel-viewport .tp-txtv:focus-within {
        border-color: var(--aurora-accent, rgba(139, 233, 255, 0.5));
        box-shadow: 
          0 0 0 3px rgba(139, 233, 255, 0.15),
          0 4px 12px rgba(139, 233, 255, 0.2);
      }

      @keyframes aurora-page-fade {
        from {
          opacity: 0;
          transform: translateY(8px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1280px) {
        .aurora-dashboard {
          gap: 12px;
          padding: 10px;
        }

        .aurora-tab {
          font-size: 13px;
          padding: 10px 14px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .aurora-dashboard,
        .aurora-dashboard * {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
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
