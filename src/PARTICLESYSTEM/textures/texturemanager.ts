/**
 * PARTICLESYSTEM/textures/texturemanager.ts - Texture management system
 * Single responsibility: Texture loading, atlas generation, and caching
 */

import * as THREE from "three/webgpu";

/**
 * Procedural texture configuration
 */
export interface ProceduralTextureConfig {
  type: 'circle' | 'square' | 'star' | 'hexagon' | 'spark' | 'smoke' | 'flare';
  size: number;
  softness: number;
  color?: THREE.Color;
}

/**
 * Texture atlas configuration
 */
export interface AtlasConfig {
  images: (string | HTMLImageElement | HTMLCanvasElement)[];
  gridSize: number;  // 2x2, 4x4, 8x8, etc.
  padding?: number;  // Padding between sprites
}

/**
 * TextureManager - Central texture management
 * Handles loading, caching, atlas generation, and procedural textures
 */
export class TextureManager {
  private textures: Map<string, THREE.Texture> = new Map();
  private atlases: Map<string, THREE.Texture> = new Map();
  private loader: THREE.TextureLoader;
  
  // Built-in procedural textures
  public readonly BUILTIN = {
    CIRCLE: 'builtin_circle',
    SQUARE: 'builtin_square',
    STAR: 'builtin_star',
    HEXAGON: 'builtin_hexagon',
    SPARK: 'builtin_spark',
    SMOKE: 'builtin_smoke',
    FLARE: 'builtin_flare',
  };
  
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.generateBuiltinTextures();
  }
  
  /**
   * Load texture from URL
   */
  public async loadTexture(url: string): Promise<THREE.Texture> {
    // Check cache
    if (this.textures.has(url)) {
      return this.textures.get(url)!;
    }
    
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          this.textures.set(url, texture);
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Get cached texture
   */
  public getTexture(key: string): THREE.Texture | undefined {
    return this.textures.get(key);
  }
  
  /**
   * Generate procedural texture
   */
  public generateTexture(config: ProceduralTextureConfig): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = config.size;
    canvas.height = config.size;
    const ctx = canvas.getContext('2d')!;
    
    const centerX = config.size / 2;
    const centerY = config.size / 2;
    const radius = config.size / 2;
    
    // Clear
    ctx.clearRect(0, 0, config.size, config.size);
    
    switch (config.type) {
      case 'circle':
        this.drawCircle(ctx, centerX, centerY, radius, config.softness);
        break;
      
      case 'square':
        this.drawSquare(ctx, centerX, centerY, radius, config.softness);
        break;
      
      case 'star':
        this.drawStar(ctx, centerX, centerY, radius, 4, config.softness);
        break;
      
      case 'hexagon':
        this.drawPolygon(ctx, centerX, centerY, radius, 6, config.softness);
        break;
      
      case 'spark':
        this.drawSpark(ctx, centerX, centerY, radius, config.softness);
        break;
      
      case 'smoke':
        this.drawSmoke(ctx, centerX, centerY, radius, config.softness);
        break;
      
      case 'flare':
        this.drawFlare(ctx, centerX, centerY, radius, config.softness);
        break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  /**
   * Create texture atlas from multiple images
   */
  public async createAtlas(config: AtlasConfig): Promise<THREE.Texture> {
    const gridSize = config.gridSize;
    const padding = config.padding || 0;
    const cellSize = 512; // Size of each cell
    const atlasSize = gridSize * cellSize;
    
    const canvas = document.createElement('canvas');
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    const ctx = canvas.getContext('2d')!;
    
    // Clear to transparent
    ctx.clearRect(0, 0, atlasSize, atlasSize);
    
    // Load and draw each image
    for (let i = 0; i < config.images.length && i < gridSize * gridSize; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = col * cellSize + padding;
      const y = row * cellSize + padding;
      const size = cellSize - padding * 2;
      
      const image = config.images[i];
      
      if (typeof image === 'string') {
        // Load from URL
        const img = await this.loadImage(image);
        ctx.drawImage(img, x, y, size, size);
      } else {
        // Direct HTMLImageElement or HTMLCanvasElement
        ctx.drawImage(image, x, y, size, size);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  /**
   * Generate built-in textures
   */
  private generateBuiltinTextures(): void {
    const size = 256;
    const softness = 0.3;
    
    // Circle
    this.textures.set(
      this.BUILTIN.CIRCLE,
      this.generateTexture({ type: 'circle', size, softness })
    );
    
    // Square
    this.textures.set(
      this.BUILTIN.SQUARE,
      this.generateTexture({ type: 'square', size, softness })
    );
    
    // Star
    this.textures.set(
      this.BUILTIN.STAR,
      this.generateTexture({ type: 'star', size, softness })
    );
    
    // Hexagon
    this.textures.set(
      this.BUILTIN.HEXAGON,
      this.generateTexture({ type: 'hexagon', size, softness })
    );
    
    // Spark
    this.textures.set(
      this.BUILTIN.SPARK,
      this.generateTexture({ type: 'spark', size, softness: 0.5 })
    );
    
    // Smoke
    this.textures.set(
      this.BUILTIN.SMOKE,
      this.generateTexture({ type: 'smoke', size, softness: 0.8 })
    );
    
    // Flare
    this.textures.set(
      this.BUILTIN.FLARE,
      this.generateTexture({ type: 'flare', size, softness: 0.7 })
    );
  }
  
  // ========== Drawing Functions ==========
  
  private drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, softness: number): void {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1 - softness, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, x * 2, y * 2);
  }
  
  private drawSquare(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, softness: number): void {
    const size = r * 1.4;
    const softEdge = size * softness;
    
    // Create soft square using multiple fills
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const currentSize = size - softEdge * t;
      const alpha = 1 - t;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(
        x - currentSize / 2,
        y - currentSize / 2,
        currentSize,
        currentSize
      );
    }
  }
  
  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, softness: number): void {
    ctx.save();
    ctx.translate(x, y);
    
    // Draw star with gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1 - softness, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? r : r * 0.4;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  private drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, softness: number): void {
    ctx.save();
    ctx.translate(x, y);
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1 - softness, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  private drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, softness: number): void {
    // Bright center with rays
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, x * 2, y * 2);
    
    // Add cross rays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.stroke();
  }
  
  private drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, softness: number): void {
    // Wispy smoke using multiple overlapping circles
    const numPuffs = 8;
    
    for (let i = 0; i < numPuffs; i++) {
      const angle = (i / numPuffs) * Math.PI * 2;
      const offsetX = Math.cos(angle) * r * 0.3;
      const offsetY = Math.sin(angle) * r * 0.3;
      const puffR = r * 0.6;
      
      const gradient = ctx.createRadialGradient(
        x + offsetX, y + offsetY, 0,
        x + offsetX, y + offsetY, puffR
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, puffR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  private drawFlare(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, softness: number): void {
    // Lens flare with multiple elements
    
    // Core
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, r * 0.3);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGradient;
    ctx.fillRect(0, 0, x * 2, y * 2);
    
    // Halo
    const haloGradient = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
    haloGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    haloGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    haloGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = haloGradient;
    ctx.fillRect(0, 0, x * 2, y * 2);
  }
  
  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  /**
   * Dispose all textures
   */
  public dispose(): void {
    this.textures.forEach(texture => texture.dispose());
    this.atlases.forEach(texture => texture.dispose());
    this.textures.clear();
    this.atlases.clear();
  }
}

