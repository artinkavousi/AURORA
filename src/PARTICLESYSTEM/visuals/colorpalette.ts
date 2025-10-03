/**
 * PARTICLESYSTEM/visuals/colorpalette.ts - Color palette and gradient system
 * Single responsibility: Color gradient definitions and sampling
 */

import { Fn, vec3, vec4, float, int, If, mix, clamp } from "three/tsl";

/**
 * Color stop in a gradient
 */
export interface ColorStop {
  position: number;  // [0.0 - 1.0]
  color: [number, number, number];
  alpha: number;
}

/**
 * Color gradient definition
 */
export interface ColorGradient {
  name: string;
  stops: ColorStop[];
  mode: 'RGB' | 'HSV' | 'LAB';  // Interpolation color space
  cyclic: boolean;               // Wrap around for continuous gradients
}

/**
 * Preset color gradients
 */
export const COLOR_GRADIENTS: Record<string, ColorGradient> = {
  // === ELEMENTAL ===
  FIRE: {
    name: 'Fire',
    stops: [
      { position: 0.0, color: [0.1, 0.0, 0.0], alpha: 1.0 },  // Dark red
      { position: 0.3, color: [1.0, 0.0, 0.0], alpha: 1.0 },  // Red
      { position: 0.6, color: [1.0, 0.5, 0.0], alpha: 1.0 },  // Orange
      { position: 1.0, color: [1.0, 1.0, 0.8], alpha: 0.9 },  // White-yellow
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  ICE: {
    name: 'Ice',
    stops: [
      { position: 0.0, color: [0.0, 0.1, 0.3], alpha: 1.0 },  // Deep blue
      { position: 0.5, color: [0.2, 0.5, 0.9], alpha: 1.0 },  // Ice blue
      { position: 1.0, color: [0.8, 0.95, 1.0], alpha: 0.9 }, // Pale cyan
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  POISON: {
    name: 'Poison',
    stops: [
      { position: 0.0, color: [0.1, 0.2, 0.0], alpha: 1.0 },  // Dark green
      { position: 0.5, color: [0.3, 1.0, 0.2], alpha: 1.0 },  // Toxic green
      { position: 1.0, color: [0.8, 1.0, 0.4], alpha: 0.8 },  // Sickly yellow
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  ELECTRIC: {
    name: 'Electric',
    stops: [
      { position: 0.0, color: [0.0, 0.0, 0.2], alpha: 1.0 },  // Dark blue
      { position: 0.4, color: [0.0, 0.5, 1.0], alpha: 1.0 },  // Electric blue
      { position: 0.7, color: [0.5, 0.8, 1.0], alpha: 1.0 },  // Bright cyan
      { position: 1.0, color: [1.0, 1.0, 1.0], alpha: 0.9 },  // White spark
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  // === NATURAL ===
  SUNSET: {
    name: 'Sunset',
    stops: [
      { position: 0.0, color: [0.1, 0.0, 0.2], alpha: 1.0 },  // Purple dusk
      { position: 0.3, color: [1.0, 0.2, 0.3], alpha: 1.0 },  // Pink
      { position: 0.6, color: [1.0, 0.5, 0.0], alpha: 1.0 },  // Orange
      { position: 1.0, color: [1.0, 0.9, 0.2], alpha: 1.0 },  // Golden
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  OCEAN: {
    name: 'Ocean',
    stops: [
      { position: 0.0, color: [0.0, 0.1, 0.2], alpha: 1.0 },  // Deep ocean
      { position: 0.5, color: [0.0, 0.3, 0.6], alpha: 1.0 },  // Mid ocean
      { position: 1.0, color: [0.3, 0.7, 0.9], alpha: 0.85 }, // Shallow water
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  LAVA: {
    name: 'Lava',
    stops: [
      { position: 0.0, color: [0.2, 0.0, 0.0], alpha: 1.0 },  // Cooled lava
      { position: 0.4, color: [1.0, 0.1, 0.0], alpha: 1.0 },  // Red hot
      { position: 0.7, color: [1.0, 0.5, 0.0], alpha: 1.0 },  // Orange glow
      { position: 1.0, color: [1.0, 1.0, 0.5], alpha: 1.0 },  // White hot
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  FOREST: {
    name: 'Forest',
    stops: [
      { position: 0.0, color: [0.05, 0.15, 0.05], alpha: 1.0 }, // Dark green
      { position: 0.4, color: [0.2, 0.5, 0.1], alpha: 1.0 },    // Forest green
      { position: 0.7, color: [0.4, 0.8, 0.2], alpha: 1.0 },    // Bright green
      { position: 1.0, color: [0.8, 1.0, 0.4], alpha: 1.0 },    // Lime
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  // === SPECTRUM ===
  RAINBOW: {
    name: 'Rainbow',
    stops: [
      { position: 0.00, color: [1.0, 0.0, 0.0], alpha: 1.0 }, // Red
      { position: 0.17, color: [1.0, 0.5, 0.0], alpha: 1.0 }, // Orange
      { position: 0.33, color: [1.0, 1.0, 0.0], alpha: 1.0 }, // Yellow
      { position: 0.50, color: [0.0, 1.0, 0.0], alpha: 1.0 }, // Green
      { position: 0.67, color: [0.0, 0.0, 1.0], alpha: 1.0 }, // Blue
      { position: 0.83, color: [0.3, 0.0, 0.5], alpha: 1.0 }, // Indigo
      { position: 1.00, color: [0.5, 0.0, 1.0], alpha: 1.0 }, // Violet
    ],
    mode: 'HSV',
    cyclic: true,
  },
  
  COOL_WARM: {
    name: 'Cool to Warm',
    stops: [
      { position: 0.0, color: [0.0, 0.2, 0.5], alpha: 1.0 },  // Cool blue
      { position: 0.5, color: [0.5, 0.5, 0.5], alpha: 1.0 },  // Neutral gray
      { position: 1.0, color: [1.0, 0.3, 0.0], alpha: 1.0 },  // Warm orange
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  // === MONOCHROME ===
  MONOCHROME: {
    name: 'Monochrome',
    stops: [
      { position: 0.0, color: [0.0, 0.0, 0.0], alpha: 1.0 },  // Black
      { position: 1.0, color: [1.0, 1.0, 1.0], alpha: 1.0 },  // White
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  GRAYSCALE: {
    name: 'Grayscale',
    stops: [
      { position: 0.0, color: [0.1, 0.1, 0.1], alpha: 1.0 },
      { position: 0.3, color: [0.3, 0.3, 0.3], alpha: 1.0 },
      { position: 0.6, color: [0.6, 0.6, 0.6], alpha: 1.0 },
      { position: 1.0, color: [0.9, 0.9, 0.9], alpha: 1.0 },
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  // === SPECIAL ===
  NEON: {
    name: 'Neon',
    stops: [
      { position: 0.0, color: [1.0, 0.0, 1.0], alpha: 1.0 },  // Magenta
      { position: 0.5, color: [0.0, 1.0, 1.0], alpha: 1.0 },  // Cyan
      { position: 1.0, color: [1.0, 1.0, 0.0], alpha: 1.0 },  // Yellow
    ],
    mode: 'RGB',
    cyclic: true,
  },
  
  PLASMA: {
    name: 'Plasma',
    stops: [
      { position: 0.0, color: [0.05, 0.03, 0.53], alpha: 1.0 },  // Deep purple
      { position: 0.3, color: [0.6, 0.0, 0.7], alpha: 1.0 },     // Purple
      { position: 0.6, color: [1.0, 0.3, 0.3], alpha: 1.0 },     // Pink-red
      { position: 1.0, color: [1.0, 0.9, 0.0], alpha: 1.0 },     // Yellow
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  AURORA: {
    name: 'Aurora',
    stops: [
      { position: 0.0, color: [0.0, 0.2, 0.3], alpha: 0.7 },   // Dark teal
      { position: 0.3, color: [0.0, 0.8, 0.6], alpha: 0.9 },   // Cyan-green
      { position: 0.6, color: [0.3, 1.0, 0.3], alpha: 1.0 },   // Bright green
      { position: 0.8, color: [0.6, 0.3, 1.0], alpha: 0.9 },   // Purple
      { position: 1.0, color: [1.0, 0.3, 0.8], alpha: 0.8 },   // Pink
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  // === HEATMAP ===
  TEMPERATURE: {
    name: 'Temperature',
    stops: [
      { position: 0.0, color: [0.0, 0.0, 0.5], alpha: 1.0 },   // Cold blue
      { position: 0.25, color: [0.0, 0.5, 1.0], alpha: 1.0 },  // Cool cyan
      { position: 0.5, color: [0.0, 1.0, 0.0], alpha: 1.0 },   // Green
      { position: 0.75, color: [1.0, 1.0, 0.0], alpha: 1.0 },  // Yellow
      { position: 1.0, color: [1.0, 0.0, 0.0], alpha: 1.0 },   // Hot red
    ],
    mode: 'RGB',
    cyclic: false,
  },
  
  VIRIDIS: {
    name: 'Viridis',
    stops: [
      { position: 0.0, color: [0.27, 0.00, 0.33], alpha: 1.0 },
      { position: 0.25, color: [0.23, 0.32, 0.55], alpha: 1.0 },
      { position: 0.5, color: [0.13, 0.57, 0.55], alpha: 1.0 },
      { position: 0.75, color: [0.37, 0.79, 0.38], alpha: 1.0 },
      { position: 1.0, color: [0.99, 0.91, 0.15], alpha: 1.0 },
    ],
    mode: 'RGB',
    cyclic: false,
  },
};

/**
 * Sample gradient at position t [0.0 - 1.0]
 * Returns [r, g, b, a]
 */
export function sampleGradient(gradient: ColorGradient, t: number): [number, number, number, number] {
  // Clamp or wrap t based on cyclic mode
  let sampleT = gradient.cyclic ? t % 1.0 : Math.max(0, Math.min(1, t));
  if (sampleT < 0) sampleT += 1.0;
  
  // Find surrounding stops
  let stop1 = gradient.stops[0];
  let stop2 = gradient.stops[gradient.stops.length - 1];
  
  for (let i = 0; i < gradient.stops.length - 1; i++) {
    if (sampleT >= gradient.stops[i].position && sampleT <= gradient.stops[i + 1].position) {
      stop1 = gradient.stops[i];
      stop2 = gradient.stops[i + 1];
      break;
    }
  }
  
  // Interpolate
  const range = stop2.position - stop1.position;
  const localT = range > 0 ? (sampleT - stop1.position) / range : 0;
  
  // RGB interpolation (simple linear)
  const r = stop1.color[0] + (stop2.color[0] - stop1.color[0]) * localT;
  const g = stop1.color[1] + (stop2.color[1] - stop1.color[1]) * localT;
  const b = stop1.color[2] + (stop2.color[2] - stop1.color[2]) * localT;
  const a = stop1.alpha + (stop2.alpha - stop1.alpha) * localT;
  
  return [r, g, b, a];
}

/**
 * TSL function for GPU-side gradient sampling
 * Creates a function that samples a gradient uploaded as a uniform array
 */
export function createGradientSamplerTSL(gradient: ColorGradient) {
  // Convert gradient stops to arrays for upload
  const stopCount = gradient.stops.length;
  const positions = new Float32Array(stopCount);
  const colors = new Float32Array(stopCount * 4); // RGBA
  
  gradient.stops.forEach((stop, i) => {
    positions[i] = stop.position;
    colors[i * 4 + 0] = stop.color[0];
    colors[i * 4 + 1] = stop.color[1];
    colors[i * 4 + 2] = stop.color[2];
    colors[i * 4 + 3] = stop.alpha;
  });
  
  // Create TSL sampling function
  return Fn(([t_input]) => {
    const t = float(t_input).toVar('t');
    
    // Clamp or wrap based on cyclic mode
    if (gradient.cyclic) {
      t.assign(t.mod(1.0));
    } else {
      t.assign(clamp(t, 0, 1));
    }
    
    // Find surrounding stops (unrolled for performance)
    const result = vec4(0, 0, 0, 1).toVar('result');
    
    // Simple two-stop interpolation for now (will expand for more stops)
    if (stopCount === 2) {
      const color1 = vec4(
        colors[0], colors[1], colors[2], colors[3]
      );
      const color2 = vec4(
        colors[4], colors[5], colors[6], colors[7]
      );
      result.assign(mix(color1, color2, t));
    } else {
      // Multi-stop gradient (linear search)
      // This could be optimized with binary search or texture lookup
      for (let i = 0; i < stopCount - 1; i++) {
        const pos1 = positions[i];
        const pos2 = positions[i + 1];
        const color1 = vec4(
          colors[i * 4 + 0],
          colors[i * 4 + 1],
          colors[i * 4 + 2],
          colors[i * 4 + 3]
        );
        const color2 = vec4(
          colors[(i + 1) * 4 + 0],
          colors[(i + 1) * 4 + 1],
          colors[(i + 1) * 4 + 2],
          colors[(i + 1) * 4 + 3]
        );
        
        If(t.greaterThanEqual(pos1).and(t.lessThanEqual(pos2)), () => {
          const localT = t.sub(pos1).div(pos2 - pos1);
          result.assign(mix(color1, color2, localT));
        });
      }
    }
    
    return result;
  }).setLayout({
    name: 'sampleGradient',
    type: 'vec4',
    inputs: [{ name: 't', type: 'float' }],
  });
}

/**
 * Get list of all gradient names
 */
export function getGradientNames(): string[] {
  return Object.keys(COLOR_GRADIENTS);
}

/**
 * Get gradient by name
 */
export function getGradient(name: string): ColorGradient | undefined {
  return COLOR_GRADIENTS[name];
}

/**
 * Create custom gradient
 */
export function createCustomGradient(
  name: string,
  stops: ColorStop[],
  mode: 'RGB' | 'HSV' | 'LAB' = 'RGB',
  cyclic: boolean = false
): ColorGradient {
  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  
  return {
    name,
    stops: sortedStops,
    mode,
    cyclic,
  };
}

