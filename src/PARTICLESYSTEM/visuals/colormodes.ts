/**
 * PARTICLESYSTEM/visuals/colormodes.ts - Particle color mode definitions
 * Single responsibility: Color mode enums and TSL implementations
 */

/**
 * Color modes for particle rendering
 */
export enum ColorMode {
  // === EXISTING MODES ===
  VELOCITY = 0,          // Speed-based HSV (current)
  DENSITY = 1,           // Density gradient (current)
  PRESSURE = 2,          // Pressure heatmap (current)
  MATERIAL = 3,          // Per-material color (current)
  
  // === NEW GRADIENT MODES ===
  GRADIENT = 4,          // Custom gradient (static)
  GRADIENT_VELOCITY = 5, // Gradient mapped to velocity
  GRADIENT_DENSITY = 6,  // Gradient mapped to density
  GRADIENT_LIFETIME = 7, // Gradient over particle age
  
  // === PHYSICAL PROPERTIES ===
  TEMPERATURE = 8,       // Black-body radiation color
  DEPTH = 9,             // Z-depth based coloring
  HEIGHT = 10,           // Y-position based coloring
  DISTANCE = 11,         // Distance from center
  
  // === SIMULATION DATA ===
  FORCE_MAGNITUDE = 12,  // Total force intensity
  VORTICITY = 13,        // Curl magnitude
  STRESS = 14,           // Material stress
  
  // === CUSTOM ===
  CUSTOM = 15,           // User-defined TSL function
}

/**
 * Get color mode name for UI
 */
export function getColorModeName(mode: ColorMode): string {
  const names: Record<ColorMode, string> = {
    [ColorMode.VELOCITY]: 'Velocity (HSV)',
    [ColorMode.DENSITY]: 'Density',
    [ColorMode.PRESSURE]: 'Pressure',
    [ColorMode.MATERIAL]: 'Material Type',
    [ColorMode.GRADIENT]: 'Custom Gradient',
    [ColorMode.GRADIENT_VELOCITY]: 'Gradient (Velocity)',
    [ColorMode.GRADIENT_DENSITY]: 'Gradient (Density)',
    [ColorMode.GRADIENT_LIFETIME]: 'Gradient (Lifetime)',
    [ColorMode.TEMPERATURE]: 'Temperature',
    [ColorMode.DEPTH]: 'Depth (Z)',
    [ColorMode.HEIGHT]: 'Height (Y)',
    [ColorMode.DISTANCE]: 'Distance from Center',
    [ColorMode.FORCE_MAGNITUDE]: 'Force Magnitude',
    [ColorMode.VORTICITY]: 'Vorticity',
    [ColorMode.STRESS]: 'Material Stress',
    [ColorMode.CUSTOM]: 'Custom Shader',
  };
  return names[mode] || 'Unknown';
}

/**
 * Get available color modes
 */
export function getAvailableColorModes(): ColorMode[] {
  return [
    ColorMode.VELOCITY,
    ColorMode.DENSITY,
    ColorMode.MATERIAL,
    ColorMode.GRADIENT,
    ColorMode.GRADIENT_VELOCITY,
    ColorMode.GRADIENT_DENSITY,
    ColorMode.TEMPERATURE,
    ColorMode.HEIGHT,
    // More modes available but hidden by default
  ];
}

/**
 * Color mode descriptions
 */
export const COLOR_MODE_DESCRIPTIONS: Record<ColorMode, string> = {
  [ColorMode.VELOCITY]: 'Rainbow colors based on particle speed',
  [ColorMode.DENSITY]: 'Heatmap showing particle density',
  [ColorMode.PRESSURE]: 'Pressure visualization',
  [ColorMode.MATERIAL]: 'Unique color per material type',
  [ColorMode.GRADIENT]: 'Static custom color gradient',
  [ColorMode.GRADIENT_VELOCITY]: 'Gradient mapped to velocity magnitude',
  [ColorMode.GRADIENT_DENSITY]: 'Gradient mapped to density values',
  [ColorMode.GRADIENT_LIFETIME]: 'Gradient changes over particle age',
  [ColorMode.TEMPERATURE]: 'Black-body radiation (physics-based)',
  [ColorMode.DEPTH]: 'Color based on Z-axis position',
  [ColorMode.HEIGHT]: 'Color based on Y-axis height',
  [ColorMode.DISTANCE]: 'Color by distance from simulation center',
  [ColorMode.FORCE_MAGNITUDE]: 'Visualize total force on particles',
  [ColorMode.VORTICITY]: 'Show rotational flow (curl)',
  [ColorMode.STRESS]: 'Material stress and deformation',
  [ColorMode.CUSTOM]: 'User-defined custom shader function',
};

