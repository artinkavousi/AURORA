/**
 * PANEL/animation-controller.ts - Smooth animation system for panel transitions
 * Handles all panel state transitions with 60fps animations
 */

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export type AnimationEasing = 
  | 'ease-in-out' 
  | 'ease-out' 
  | 'ease-in' 
  | 'cubic-smooth' 
  | 'cubic-snap';

export const EASING_FUNCTIONS: Record<AnimationEasing, string> = {
  'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  'cubic-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'cubic-snap': 'cubic-bezier(0.65, 0, 0.35, 1)',
};

export const ANIMATION_DURATIONS = {
  tabSwitch: 300,
  panelToggle: 400,
  dockChange: 600,
  snapZone: 200,
  tabGlow: 150,
} as const;

/**
 * AnimationController - Manages smooth transitions for panel system
 */
export class AnimationController {
  private activeAnimations: Map<string, Animation> = new Map();

  /**
   * Animate element properties
   */
  animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    id?: string
  ): Promise<void> {
    // Cancel existing animation with same ID
    if (id && this.activeAnimations.has(id)) {
      this.activeAnimations.get(id)?.cancel();
    }

    return new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      
      if (id) {
        this.activeAnimations.set(id, animation);
      }

      animation.onfinish = () => {
        if (id) {
          this.activeAnimations.delete(id);
        }
        resolve();
      };

      animation.oncancel = () => {
        if (id) {
          this.activeAnimations.delete(id);
        }
        resolve();
      };
    });
  }

  /**
   * Panel collapse animation
   */
  async collapsePanel(
    container: HTMLElement,
    panelContent: HTMLElement,
    dockSide: 'left' | 'right' | 'bottom',
    collapsedSize: number
  ): Promise<void> {
    const isHorizontal = dockSide === 'bottom';
    const property = isHorizontal ? 'height' : 'width';
    const currentSize = isHorizontal ? container.offsetHeight : container.offsetWidth;

    await Promise.all([
      // Shrink container
      this.animate(
        container,
        [
          { [property]: `${currentSize}px` },
          { [property]: `${collapsedSize}px` },
        ],
        {
          duration: ANIMATION_DURATIONS.panelToggle,
          easing: EASING_FUNCTIONS['cubic-smooth'],
          fill: 'forwards',
        },
        'panel-collapse'
      ),
      // Fade out content
      this.animate(
        panelContent,
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: `translateX(${dockSide === 'right' ? '20px' : '-20px'})` },
        ],
        {
          duration: ANIMATION_DURATIONS.panelToggle * 0.6,
          easing: EASING_FUNCTIONS['ease-out'],
          fill: 'forwards',
        },
        'panel-content-fade'
      ),
    ]);
  }

  /**
   * Panel expand animation
   */
  async expandPanel(
    container: HTMLElement,
    panelContent: HTMLElement,
    dockSide: 'left' | 'right' | 'bottom',
    collapsedSize: number,
    expandedSize: number
  ): Promise<void> {
    const isHorizontal = dockSide === 'bottom';
    const property = isHorizontal ? 'height' : 'width';

    await Promise.all([
      // Expand container
      this.animate(
        container,
        [
          { [property]: `${collapsedSize}px` },
          { [property]: `${expandedSize}px` },
        ],
        {
          duration: ANIMATION_DURATIONS.panelToggle,
          easing: EASING_FUNCTIONS['cubic-smooth'],
          fill: 'forwards',
        },
        'panel-expand'
      ),
      // Fade in content (delayed)
      this.animate(
        panelContent,
        [
          { opacity: 0, transform: `translateX(${dockSide === 'right' ? '20px' : '-20px'})` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        {
          duration: ANIMATION_DURATIONS.panelToggle * 0.8,
          delay: ANIMATION_DURATIONS.panelToggle * 0.2,
          easing: EASING_FUNCTIONS['ease-out'],
          fill: 'forwards',
        },
        'panel-content-show'
      ),
    ]);
  }

  /**
   * Tab switch animation
   */
  async switchTab(
    oldContent: HTMLElement,
    newContent: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down' = 'right'
  ): Promise<void> {
    const offset = direction === 'left' || direction === 'up' ? '-20px' : '20px';
    const axis = direction === 'up' || direction === 'down' ? 'Y' : 'X';

    // Fade out old content
    const fadeOut = this.animate(
      oldContent,
      [
        { opacity: 1, transform: 'translate(0, 0)' },
        { opacity: 0, transform: `translate${axis}(${offset})` },
      ],
      {
        duration: ANIMATION_DURATIONS.tabSwitch * 0.5,
        easing: EASING_FUNCTIONS['ease-in'],
        fill: 'forwards',
      },
      'tab-fade-out'
    );

    // Fade in new content (overlapped)
    setTimeout(() => {
      this.animate(
        newContent,
        [
          { opacity: 0, transform: `translate${axis}(${offset})` },
          { opacity: 1, transform: 'translate(0, 0)' },
        ],
        {
          duration: ANIMATION_DURATIONS.tabSwitch * 0.7,
          easing: EASING_FUNCTIONS['ease-out'],
          fill: 'forwards',
        },
        'tab-fade-in'
      );
    }, ANIMATION_DURATIONS.tabSwitch * 0.2);

    await fadeOut;
  }

  /**
   * Dock change animation (complex multi-step)
   */
  async changeDock(
    container: HTMLElement,
    from: 'left' | 'right' | 'bottom',
    to: 'left' | 'right' | 'bottom',
    fromSize: number,
    toSize: number,
    collapsedSize: number
  ): Promise<void> {
    // Step 1: Collapse at current position
    await this.animate(
      container,
      [
        { 
          [from === 'bottom' ? 'height' : 'width']: `${fromSize}px`,
        },
        { 
          [from === 'bottom' ? 'height' : 'width']: `${collapsedSize}px`,
        },
      ],
      {
        duration: ANIMATION_DURATIONS.dockChange * 0.3,
        easing: EASING_FUNCTIONS['cubic-smooth'],
        fill: 'forwards',
      },
      'dock-change-1'
    );

    // Step 2: Fade out during transition
    await this.animate(
      container,
      [{ opacity: 1 }, { opacity: 0.3 }],
      {
        duration: ANIMATION_DURATIONS.dockChange * 0.2,
        easing: EASING_FUNCTIONS['ease-out'],
        fill: 'forwards',
      },
      'dock-change-2'
    );

    // Position change happens here (caller updates DOM)

    // Step 3: Fade back in
    await this.animate(
      container,
      [{ opacity: 0.3 }, { opacity: 1 }],
      {
        duration: ANIMATION_DURATIONS.dockChange * 0.2,
        easing: EASING_FUNCTIONS['ease-in'],
        fill: 'forwards',
      },
      'dock-change-3'
    );

    // Step 4: Expand at new position
    await this.animate(
      container,
      [
        { 
          [to === 'bottom' ? 'height' : 'width']: `${collapsedSize}px`,
        },
        { 
          [to === 'bottom' ? 'height' : 'width']: `${toSize}px`,
        },
      ],
      {
        duration: ANIMATION_DURATIONS.dockChange * 0.3,
        easing: EASING_FUNCTIONS['cubic-smooth'],
        fill: 'forwards',
      },
      'dock-change-4'
    );
  }

  /**
   * Tab indicator slide animation
   */
  async slideTabIndicator(
    indicator: HTMLElement,
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number }
  ): Promise<void> {
    await this.animate(
      indicator,
      [
        { transform: `translate(${fromPosition.x}px, ${fromPosition.y}px)` },
        { transform: `translate(${toPosition.x}px, ${toPosition.y}px)` },
      ],
      {
        duration: ANIMATION_DURATIONS.tabSwitch,
        easing: EASING_FUNCTIONS['cubic-smooth'],
        fill: 'forwards',
      },
      'tab-indicator'
    );
  }

  /**
   * Snap zone highlight pulse
   */
  async pulseSnapZone(element: HTMLElement): Promise<void> {
    await this.animate(
      element,
      [
        { opacity: 0.3, transform: 'scale(1)' },
        { opacity: 0.7, transform: 'scale(1.02)' },
        { opacity: 0.3, transform: 'scale(1)' },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        easing: EASING_FUNCTIONS['ease-in-out'],
      },
      `snap-zone-${element.id}`
    );
  }

  /**
   * Drag ghost effect
   */
  async startDrag(element: HTMLElement): Promise<void> {
    await this.animate(
      element,
      [
        { 
          opacity: 1,
          transform: 'scale(1)',
          filter: 'drop-shadow(0 8px 24px rgba(80, 120, 180, 0.3))',
        },
        { 
          opacity: 0.9,
          transform: 'scale(1.02)',
          filter: 'drop-shadow(0 16px 48px rgba(80, 120, 180, 0.6))',
        },
      ],
      {
        duration: 200,
        easing: EASING_FUNCTIONS['ease-out'],
        fill: 'forwards',
      },
      'drag-start'
    );
  }

  /**
   * Drop animation
   */
  async endDrag(element: HTMLElement): Promise<void> {
    await this.animate(
      element,
      [
        { 
          opacity: 0.9,
          transform: 'scale(1.02)',
          filter: 'drop-shadow(0 16px 48px rgba(80, 120, 180, 0.6))',
        },
        { 
          opacity: 1,
          transform: 'scale(1)',
          filter: 'drop-shadow(0 8px 24px rgba(80, 120, 180, 0.3))',
        },
      ],
      {
        duration: 200,
        easing: EASING_FUNCTIONS['ease-in'],
        fill: 'forwards',
      },
      'drag-end'
    );
  }

  /**
   * Tab glow effect (for active tab)
   */
  async glowTab(element: HTMLElement): Promise<void> {
    await this.animate(
      element,
      [
        { boxShadow: '0 0 20px rgba(80, 120, 180, 0.5)' },
        { boxShadow: '0 0 30px rgba(80, 120, 180, 0.7)' },
        { boxShadow: '0 0 20px rgba(80, 120, 180, 0.5)' },
      ],
      {
        duration: 2000,
        iterations: Infinity,
        easing: EASING_FUNCTIONS['ease-in-out'],
      },
      `tab-glow-${element.id}`
    );
  }

  /**
   * Cancel specific animation
   */
  cancel(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(id);
    }
  }

  /**
   * Cancel all animations
   */
  cancelAll(): void {
    this.activeAnimations.forEach(animation => animation.cancel());
    this.activeAnimations.clear();
  }

  /**
   * Dispose controller
   */
  dispose(): void {
    this.cancelAll();
  }
}



