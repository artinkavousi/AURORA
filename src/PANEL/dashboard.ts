/**
 * PANEL/dashboard.ts - Glassmorphism-styled draggable panel system
 * Single responsibility: UI framework with beautiful, modular control panels
 */

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import * as InfodumpPlugin from 'tweakpane-plugin-infodump';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials/dist/types/fps-graph/api/fps-graph';

export interface DashboardOptions {
  showInfo?: boolean;
  showFPS?: boolean;
  enableGlassmorphism?: boolean;
}

export interface PanelConfig {
  title: string;
  position?: { x: number; y: number };
  expanded?: boolean;
  draggable?: boolean;
  collapsible?: boolean;
}

/**
 * Dashboard - Advanced UI controller with glassmorphism styling
 * Manages multiple draggable, collapsible control panels
 */
export class Dashboard {
  private panels: Map<string, { pane: Pane; container: HTMLDivElement }> = new Map();
  private fpsGraph: FpsGraphBladeApi | null = null;
  private infoPane: Pane | null = null;
  private styleSheet: HTMLStyleElement;
  private enableGlassmorphism: boolean;

  constructor(options: DashboardOptions = {}) {
    const { showInfo = true, showFPS = true, enableGlassmorphism = true } = options;
    this.enableGlassmorphism = enableGlassmorphism;

    // Inject glassmorphism styles IMMEDIATELY
    this.styleSheet = this.injectStyles();
    console.log('✨ Glassmorphism styles injected!', this.styleSheet.id);

    // Create FPS monitor panel (top-left, compact)
    if (showFPS) {
      this.createFPSPanel();
    }

    // Create info panel (bottom-left)
    if (showInfo) {
      this.createInfoPanel();
    }
  }

  /**
   * Inject enhanced glassmorphism and draggable panel styles
   */
  private injectStyles(): HTMLStyleElement {
    // Remove any existing glassmorphism styles
    const existing = document.getElementById('flow-glassmorphism-styles');
    if (existing) {
      existing.remove();
    }

    const style = document.createElement('style');
    style.id = 'flow-glassmorphism-styles';
    style.textContent = `
      /* ═══════════════════════════════════════════════════════════════════ */
      /* 🎨 FLOW GLASSMORPHISM DESIGN SYSTEM - Unified Panel Pipeline v2.0 */
      /* ═══════════════════════════════════════════════════════════════════ */

      /* Advanced Glassmorphism base - Target all Tweakpane roots (solid/opaque default) */
      .tp-dfwv,
      .tp-rotv,
      [class*="tp-"][class*="v"] > div:first-child,
      .panel-container > div:first-child {
        backdrop-filter: blur(50px) saturate(200%) brightness(1.2) contrast(1.15);
        -webkit-backdrop-filter: blur(50px) saturate(200%) brightness(1.2) contrast(1.15);
        background: linear-gradient(
          135deg,
          rgba(35, 46, 92, 0.78) 0%,
          rgba(25, 35, 75, 0.68) 50%,
          rgba(30, 40, 82, 0.73) 100%
        ) !important;
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 20px !important;
        box-shadow: 
          0 16px 48px 0 rgba(0, 0, 0, 0.45),
          0 4px 24px 0 rgba(139, 92, 246, 0.35),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.20),
          inset 0 0 100px 0 rgba(139, 92, 246, 0.08);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        position: relative;
      }

      /* Subtle inner glow effect with tint */
      .tp-dfwv::before,
      .tp-rotv::before,
      .panel-container > div:first-child::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(139, 92, 246, 0.6) 30%,
          rgba(99, 102, 241, 0.6) 70%,
          transparent
        );
        opacity: 0.7;
        filter: blur(1px);
      }

      /* Hover: LIGHTER frosted glass effect (less blur, more transparent) */
      .tp-dfwv:hover,
      .tp-rotv:hover,
      .panel-container:hover > div:first-child {
        backdrop-filter: blur(20px) saturate(160%) brightness(1.1) contrast(1.05);
        -webkit-backdrop-filter: blur(20px) saturate(160%) brightness(1.1) contrast(1.05);
        background: linear-gradient(
          135deg,
          rgba(25, 35, 70, 0.45) 0%,
          rgba(15, 25, 55, 0.35) 50%,
          rgba(20, 30, 62, 0.40) 100%
        ) !important;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 
          0 6px 24px 0 rgba(0, 0, 0, 0.25),
          0 1px 8px 0 rgba(30, 41, 82, 0.15),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
          inset 0 0 40px 0 rgba(139, 92, 246, 0.02);
        transform: translateY(-1px);
      }

      /* ═══════════════════════════════════════════════════════════════════ */
      /* 📦 Enhanced Draggable Panel Container System */
      /* ═══════════════════════════════════════════════════════════════════ */

      .panel-container {
        position: absolute;
        z-index: 1000;
        touch-action: none;
        user-select: none;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        transition: filter 0.3s ease, transform 0.2s ease;
        animation: panelFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes panelFadeIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .panel-container:hover {
        filter: drop-shadow(0 8px 24px rgba(139, 92, 246, 0.2));
      }

      .panel-container.dragging {
        z-index: 2000;
        cursor: grabbing !important;
        filter: drop-shadow(0 12px 32px rgba(139, 92, 246, 0.3));
        transform: scale(1.02);
      }

      /* Enhanced panel header - draggable area */
      .tp-fldv_t {
        cursor: grab;
        transition: all 0.3s ease;
        position: relative;
        padding: 12px 16px !important;
        background: linear-gradient(
          135deg,
          rgba(139, 92, 246, 0.08) 0%,
          rgba(99, 102, 241, 0.05) 100%
        );
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .tp-fldv_t::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(
          180deg,
          rgba(139, 92, 246, 0.8) 0%,
          rgba(99, 102, 241, 0.6) 100%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .tp-fldv_t:hover {
        background: linear-gradient(
          135deg,
          rgba(139, 92, 246, 0.12) 0%,
          rgba(99, 102, 241, 0.08) 100%
        );
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      .tp-fldv_t:hover::before {
        opacity: 1;
      }

      .tp-fldv_t:active {
        cursor: grabbing;
        background: rgba(139, 92, 246, 0.15);
      }

      /* Premium title styling with gradient */
      .tp-fldv_t .tp-fldv_b {
        background: linear-gradient(
          135deg,
          #8b5cf6 0%,
          #6366f1 50%,
          #a78bfa 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        text-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
      }

      /* Enhanced folder content */
      .tp-fldv_c {
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.15);
      }

      /* Nested folder styling */
      .tp-fldv .tp-fldv {
        margin: 6px 0;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      /* Premium input fields */
      .tp-rotv_b, .tp-sldtxtv_t, .tp-lblv_v {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.06) 0%,
          rgba(255, 255, 255, 0.03) 100%
        ) !important;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
        color: rgba(255, 255, 255, 0.95) !important;
        font-weight: 500;
      }

      .tp-rotv_b:hover, .tp-sldtxtv_t:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.10) 0%,
          rgba(255, 255, 255, 0.06) 100%
        ) !important;
        border: 1px solid rgba(139, 92, 246, 0.3);
        box-shadow: 
          inset 0 1px 2px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(139, 92, 246, 0.1);
      }

      .tp-rotv_b:focus, .tp-sldtxtv_t:focus {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.12) 0%,
          rgba(255, 255, 255, 0.08) 100%
        ) !important;
        border: 1px solid rgba(139, 92, 246, 0.6);
        box-shadow: 
          0 0 0 3px rgba(139, 92, 246, 0.15),
          inset 0 1px 2px rgba(0, 0, 0, 0.2),
          0 4px 12px rgba(139, 92, 246, 0.2);
        outline: none;
      }

      /* Premium labels */
      .tp-lblv_l {
        color: rgba(255, 255, 255, 0.95);
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      /* Premium buttons with animated gradient */
      .tp-btnv_b {
        background: linear-gradient(
          135deg,
          #8b5cf6 0%,
          #7c3aed 25%,
          #6366f1 50%,
          #4f46e5 75%,
          #8b5cf6 100%
        ) !important;
        background-size: 200% 200% !important;
        border: 1px solid rgba(139, 92, 246, 0.5) !important;
        border-radius: 12px;
        color: white !important;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        padding: 10px 20px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
          0 4px 16px rgba(139, 92, 246, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
        cursor: pointer;
      }

      .tp-btnv_b::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transition: left 0.5s ease;
      }

      .tp-btnv_b:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 
          0 8px 24px rgba(139, 92, 246, 0.5),
          0 4px 12px rgba(99, 102, 241, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        background-position: 100% 0 !important;
        border: 1px solid rgba(139, 92, 246, 0.8) !important;
      }

      .tp-btnv_b:hover::before {
        left: 100%;
      }

      .tp-btnv_b:active {
        transform: translateY(-1px) scale(0.98);
        box-shadow: 
          0 4px 12px rgba(139, 92, 246, 0.4),
          inset 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      /* Premium sliders */
      .tp-sldv_t {
        background: linear-gradient(
          90deg,
          rgba(139, 92, 246, 0.15) 0%,
          rgba(99, 102, 241, 0.08) 100%
        );
        border-radius: 12px;
        height: 6px;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        position: relative;
        overflow: hidden;
      }

      .tp-sldv_t::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          rgba(139, 92, 246, 0.3) 0%,
          rgba(99, 102, 241, 0.2) 50%,
          rgba(139, 92, 246, 0.1) 100%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .tp-sldv:hover .tp-sldv_t::before {
        opacity: 1;
      }

      .tp-sldv_k {
        background: linear-gradient(
          135deg,
          #a78bfa 0%,
          #8b5cf6 50%,
          #7c3aed 100%
        );
        border-radius: 12px;
        box-shadow: 
          0 2px 8px rgba(139, 92, 246, 0.5),
          0 0 0 2px rgba(139, 92, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }

      .tp-sldv_k:hover {
        box-shadow: 
          0 4px 16px rgba(139, 92, 246, 0.6),
          0 0 0 3px rgba(139, 92, 246, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.4);
        transform: scale(1.15);
      }

      /* Premium checkbox toggle */
      .tp-ckbv_i {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 100%
        );
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
      }

      .tp-ckbv_i::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(
          135deg,
          rgba(139, 92, 246, 0.5),
          rgba(99, 102, 241, 0.5)
        );
        opacity: 0;
        transition: opacity 0.3s ease;
        border-radius: 8px;
      }

      .tp-ckbv_i:checked {
        background: linear-gradient(
          135deg,
          #8b5cf6 0%,
          #7c3aed 50%,
          #6366f1 100%
        );
        border-color: rgba(139, 92, 246, 0.8);
        box-shadow: 
          0 4px 12px rgba(139, 92, 246, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .tp-ckbv_i:hover {
        border-color: rgba(139, 92, 246, 0.5);
        box-shadow: 
          inset 0 1px 3px rgba(0, 0, 0, 0.2),
          0 0 0 2px rgba(139, 92, 246, 0.2);
      }

      /* Premium list/dropdown */
      .tp-lstv_s {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 100%
        ) !important;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.95);
        padding: 8px 12px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .tp-lstv_s:hover {
        background: linear-gradient(
          135deg,
          rgba(139, 92, 246, 0.12) 0%,
          rgba(99, 102, 241, 0.08) 100%
        ) !important;
        border: 1px solid rgba(139, 92, 246, 0.4);
        box-shadow: 
          inset 0 1px 2px rgba(0, 0, 0, 0.2),
          0 0 0 1px rgba(139, 92, 246, 0.2);
      }

      .tp-lstv_s:focus {
        border: 1px solid rgba(139, 92, 246, 0.6);
        box-shadow: 
          0 0 0 3px rgba(139, 92, 246, 0.2),
          inset 0 1px 2px rgba(0, 0, 0, 0.2);
        outline: none;
      }

      /* Elegant separator */
      .tp-sprv_r {
        background: linear-gradient(
          90deg,
          transparent,
          rgba(139, 92, 246, 0.5) 50%,
          transparent
        );
        height: 2px;
        margin: 12px 0;
        border-radius: 2px;
        box-shadow: 0 1px 3px rgba(139, 92, 246, 0.3);
      }

      /* Enhanced FPS Graph */
      .tp-fldv.tp-fpsv {
        background: linear-gradient(
          135deg,
          rgba(15, 23, 42, 0.95) 0%,
          rgba(15, 23, 42, 0.85) 100%
        ) !important;
      }

      .tp-fpsv_g {
        opacity: 0.9;
      }

      .tp-fpsv_g path {
        stroke: url(#fps-gradient);
        stroke-width: 2;
        filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.5));
      }

      /* Premium scrollbar */
      .tp-dfwv::-webkit-scrollbar {
        width: 10px;
      }

      .tp-dfwv::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        margin: 4px;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .tp-dfwv::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          #8b5cf6 0%,
          #7c3aed 50%,
          #6366f1 100%
        );
        border-radius: 12px;
        border: 2px solid rgba(15, 23, 42, 0.5);
        box-shadow: 
          0 2px 8px rgba(139, 92, 246, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }

      .tp-dfwv::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          #a78bfa 0%,
          #8b5cf6 50%,
          #7c3aed 100%
        );
        box-shadow: 
          0 4px 16px rgba(139, 92, 246, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        border-color: rgba(15, 23, 42, 0.3);
      }

      /* Enhanced animation for panel appearance */
      @keyframes panelFadeIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
          filter: blur(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes panelGlow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        50% {
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
        }
      }

      .panel-container {
        animation: panelFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Smooth collapsed state */
      .tp-fldv.tp-fldv-collapsed .tp-fldv_c {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Value display */
      .tp-txtv_i {
        color: rgba(255, 255, 255, 0.95) !important;
        font-weight: 600;
      }

      /* Folder expand indicator */
      .tp-fldv_m {
        transition: transform 0.3s ease;
      }

      .tp-fldv.tp-fldv-expanded .tp-fldv_m {
        transform: rotate(90deg);
      }

      /* Enhanced binding row */
      .tp-brkv {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        margin: 2px 0;
        padding: 4px 8px;
        transition: all 0.2s ease;
      }

      .tp-brkv:hover {
        background: rgba(139, 92, 246, 0.08);
      }

      /* Info dump styling */
      .tp-infov {
        background: rgba(255, 255, 255, 0.03) !important;
        border-radius: 12px;
        padding: 12px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.6;
      }

      .tp-infov a {
        color: #a78bfa;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s ease;
      }

      .tp-infov a:hover {
        color: #8b5cf6;
        text-decoration: underline;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .panel-container {
          max-width: calc(100vw - 24px) !important;
        }
        
        .tp-dfwv {
          font-size: 11px;
          border-radius: 16px !important;
        }

        .tp-fldv_t {
          padding: 10px 12px !important;
        }

        .tp-btnv_b {
          padding: 8px 16px;
          font-size: 10px;
        }
      }

      /* Touch device optimizations */
      @media (hover: none) and (pointer: coarse) {
        .tp-btnv_b:active {
          transform: scale(0.95);
        }

        .tp-fldv_t:active {
          background: rgba(139, 92, 246, 0.2);
        }
      }

      /* Dark mode enhancements */
      @media (prefers-color-scheme: dark) {
        .tp-dfwv {
          background: linear-gradient(
            135deg,
            rgba(10, 15, 30, 0.90) 0%,
            rgba(10, 15, 30, 0.80) 100%
          ) !important;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .panel-container,
        .tp-fldv_t,
        .tp-btnv_b,
        * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .tp-dfwv {
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .tp-lblv_l {
          color: rgba(255, 255, 255, 1);
        }
      }
    `;
    document.head.appendChild(style);
    return style;
  }

  /**
   * Create FPS monitor panel
   */
  private createFPSPanel(): void {
    const config: PanelConfig = {
      title: '📊 Performance',
      position: { x: 16, y: 16 },
      expanded: false,
      draggable: true,
      collapsible: true,
    };

    const { pane } = this.createPanel('fps', config);
    
    this.fpsGraph = pane.addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      rows: 2,
    }) as FpsGraphBladeApi;
  }

  /**
   * Create info panel
   */
  private createInfoPanel(): void {
    const config: PanelConfig = {
      title: 'ℹ️ Information',
      position: { x: 16, y: window.innerHeight - 320 },
      expanded: false,
      draggable: true,
      collapsible: true,
    };

    const { pane } = this.createPanel('info', config);
    pane.registerPlugin(InfodumpPlugin);

    pane.addBlade({
      view: "infodump",
      content: 
        "**WebGPU Particle Flow System**\n\n" +
        "Realtime MLS-MPM simulation using WebGPU and Three.js TSL.\n\n" +
        "Inspired by [Refik Anadol](https://refikanadol.com/).\n\n" +
        "Based on [WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean) by matsuoka-601.\n\n" +
        "[View Source](https://github.com/holtsetio/flow/) • [More Experiments](https://holtsetio.com)",
      markdown: true,
    });

    const credits = pane.addFolder({
      title: "Credits",
      expanded: false,
    });

    credits.addBlade({
      view: "infodump",
      content: 
        "• [HDRi background](https://polyhaven.com/a/autumn_field_puresky) by Jarod Guest & Sergej Majboroda\n" +
        "• [Concrete texture](https://www.texturecan.com/details/216/) by texturecan.com",
      markdown: true,
    });
  }

  /**
   * Create a new draggable, collapsible panel
   */
  public createPanel(id: string, config: PanelConfig): { pane: any; container: HTMLDivElement } {
    // Create container
    const container = document.createElement('div');
    container.className = 'panel-container';
    container.style.position = 'absolute';
    container.style.left = `${config.position?.x ?? 16}px`;
    container.style.top = `${config.position?.y ?? 16}px`;
    container.style.zIndex = '1000';
    document.body.appendChild(container);

    // Create pane (using any to work around Tweakpane typing limitations)
    const pane: any = new Pane({
      container,
      title: config.title,
      expanded: config.expanded ?? true,
    });

    pane.registerPlugin(EssentialsPlugin);

    // Apply solid frosted glass with tint directly to Tweakpane root element (runtime fallback)
    requestAnimationFrame(() => {
      const tweakpaneRoot = container.querySelector('[class*="tp-"]');
      if (tweakpaneRoot && this.enableGlassmorphism) {
        const element = tweakpaneRoot as HTMLElement;
        // Apply solid, opaque frosted glass (hover makes it lighter/more transparent)
        element.style.backdropFilter = 'blur(50px) saturate(200%) brightness(1.2) contrast(1.15)';
        element.style.background = 'linear-gradient(135deg, rgba(35, 46, 92, 0.78) 0%, rgba(25, 35, 75, 0.68) 50%, rgba(30, 40, 82, 0.73) 100%)';
        element.style.border = '1px solid rgba(255, 255, 255, 0.28)';
        element.style.borderRadius = '20px';
        element.style.boxShadow = 
          '0 16px 48px 0 rgba(0, 0, 0, 0.45), ' +
          '0 4px 24px 0 rgba(139, 92, 246, 0.35), ' +
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.20), ' +
          'inset 0 0 100px 0 rgba(139, 92, 246, 0.08)';
        console.log(`✨ Applied solid frosted glass to panel: ${config.title}`);
      }
    });

    // Make draggable
    if (config.draggable !== false) {
      this.makeDraggable(container, pane);
    }

    // Store reference
    this.panels.set(id, { pane, container });

    return { pane, container };
  }

  /**
   * Make a panel draggable
   */
  private makeDraggable(container: HTMLDivElement, pane: Pane): void {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;

    const dragStart = (e: MouseEvent | TouchEvent) => {
      const event = 'touches' in e ? e.touches[0] : e;
      
      // Only allow dragging from title bar
      const target = event.target as HTMLElement;
      if (!target.closest('.tp-fldv_t') && !target.closest('.tp-rotv_t')) {
        return;
      }

      isDragging = true;
      container.classList.add('dragging');

      initialX = event.clientX - currentX;
      initialY = event.clientY - currentY;

      e.preventDefault();
    };

    const drag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const event = 'touches' in e ? e.touches[0] : e;

      currentX = event.clientX - initialX;
      currentY = event.clientY - initialY;

      // Constrain to viewport
      const maxX = window.innerWidth - container.offsetWidth;
      const maxY = window.innerHeight - container.offsetHeight;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    };

    const dragEnd = () => {
      isDragging = false;
      container.classList.remove('dragging');
    };

    // Mouse events
    container.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    container.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
  }

  /**
   * Get a panel by ID
   */
  public getPanel(id: string): Pane | undefined {
    return this.panels.get(id)?.pane;
  }

  /**
   * Show/hide a panel
   */
  public togglePanel(id: string, visible?: boolean): void {
    const panel = this.panels.get(id);
    if (panel) {
      panel.container.style.display = visible === undefined 
        ? (panel.container.style.display === 'none' ? 'block' : 'none')
        : (visible ? 'block' : 'none');
    }
  }

  /**
   * Call at the beginning of each frame for FPS tracking
   */
  public begin(): void {
    this.fpsGraph?.begin();
  }

  /**
   * Call at the end of each frame for FPS tracking
   */
  public end(): void {
    this.fpsGraph?.end();
  }

  /**
   * Dispose of all UI resources
   */
  public dispose(): void {
    // Dispose all panels
    this.panels.forEach(({ pane, container }) => {
      pane.dispose();
      container.remove();
    });
    this.panels.clear();

    // Remove styles
    this.styleSheet.remove();
  }
}