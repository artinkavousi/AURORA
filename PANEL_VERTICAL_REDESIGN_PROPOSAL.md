# Aurora Unified Control Surface Proposal

## Objectives
- Consolidate all control panels (Audio Reactivity, Post FX, Visuals, Physics, Theme Manager) into a single adaptive dashboard.
- Deliver a vertical tab navigation that defaults to the right edge, supports collapse/expand animations, and can be re-docked to any screen edge via drag & drop.
- Preserve Tweakpane workflows while upgrading to a refined glassmorphism system with consistent spacing, hierarchy, and iconography.
- Introduce a theme & preset pipeline that manages palette, surface, typography, and glow variables across every panel.

## Experience Pillars
1. **Unified Navigation**
   - Single dashboard shell with vertical tabs.
   - Tab badges/icons for instant recognition.
   - Smooth cross-fade between panels, preserving scroll position.
2. **Adaptive Docking**
   - Drag handle snaps shell to left, right, or bottom edge.
   - Responsive layout adapts tab orientation (vertical ↔ horizontal) based on dock target.
   - Resizable shell with inertial feel and eased transitions.
3. **Glassmorphism 2.0**
   - Frosted layers driven by CSS custom properties.
   - Ambient glow, border light, and parallax hover effects.
   - Harmonized typography scale and paddings for all Tweakpane folders.
4. **Intelligent Theming**
   - Theme Manager tab exposing curated presets (Aurora, Midnight, Solaris, Spectrum).
   - Live editing of accent hues, blur, translucency, and lighting ratios.
   - Preset lifecycle: save, rename, delete, set default (persisted to localStorage).
5. **Information Density & Grouping**
   - Re-grouped panels: Essentials, Dynamics, Advanced, Monitoring clusters.
   - Contextual helper text using subtle infodumps.
   - Quick actions area (reset, randomize, favorite presets).

## Implementation Roadmap
1. **Dashboard Shell**
   - Replace legacy floating panels with `DashboardShell` featuring tab rail, panel viewport, collapse control, drag/dock logic, resize handle.
   - Expose `registerPanel()` for panel modules; maintain plugin registration for Tweakpane.
   - Inject modernized CSS with variables: `--aurora-glass-bg1`, `--aurora-glass-bg2`, `--aurora-accent`, etc.
2. **Panel Migration**
   - Relocate `PANELsoundreactivity`, `PANELpostfx`, `PANELphysic`, `PANELvisuals` into `src/PANEL/panels`.
   - Update imports to consume the unified dashboard API.
   - Restructure sections (folders, tabs) for clarity and balanced lengths.
3. **Theme Pipeline**
   - Introduce `ThemeManagerPanel` inside `src/PANEL/panels/theme.ts`.
   - Define `DashboardTheme` interface & defaults within `dashboard.ts`.
   - Implement preset storage, load/save operations, and global CSS variable updates.
4. **UX Enhancements**
   - Add micro-interactions: hover shimmer on tabs, slide-in/out collapse animation, focus ring for keyboard navigation.
   - Provide aria attributes for accessibility.
5. **Integration**
   - Update `APP.ts` to register each panel via the new dashboard.
   - Validate layout across docking positions; ensure responsiveness down to 1024px width.

## Success Criteria
- All control panels accessible through a single adaptive shell with zero overlapping windows by default.
- Docking transitions are smooth (<200ms) with no layout flashes.
- Theme changes propagate instantly to every panel without refresh.
- Presets persist between sessions and can be restored via "Set as default".
- Codebase reflects reorganized `src/PANEL` hierarchy.
