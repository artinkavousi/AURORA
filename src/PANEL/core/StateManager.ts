/**
 * PANEL/core/StateManager.ts - State persistence with localStorage
 * Saves and loads panel state across sessions
 */

const STATE_KEY_PREFIX = 'flow-unified-panel-';

/**
 * StateManager - Persists panel state to localStorage
 */
export class StateManager {
  private enabled: boolean;
  private cache: Map<string, any> = new Map();
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    
    if (this.enabled) {
      this.loadAllFromStorage();
    }
  }
  
  /**
   * Save value
   */
  save(key: string, value: any): void {
    this.cache.set(key, value);
    
    if (this.enabled) {
      try {
        const storageKey = STATE_KEY_PREFIX + key;
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save state:', error);
      }
    }
  }
  
  /**
   * Load value
   */
  load<T = any>(key: string): T | null {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Load from storage
    if (this.enabled) {
      try {
        const storageKey = STATE_KEY_PREFIX + key;
        const json = localStorage.getItem(storageKey);
        if (json) {
          const value = JSON.parse(json);
          this.cache.set(key, value);
          return value;
        }
      } catch (error) {
        console.warn('Failed to load state:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Delete value
   */
  delete(key: string): void {
    this.cache.delete(key);
    
    if (this.enabled) {
      try {
        const storageKey = STATE_KEY_PREFIX + key;
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to delete state:', error);
      }
    }
  }
  
  /**
   * Clear all state
   */
  clear(): void {
    this.cache.clear();
    
    if (this.enabled) {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(STATE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn('Failed to clear state:', error);
      }
    }
  }
  
  /**
   * Load all from storage into cache
   */
  private loadAllFromStorage(): void {
    if (!this.enabled) return;
    
    try {
      const keys = Object.keys(localStorage);
      for (const storageKey of keys) {
        if (storageKey.startsWith(STATE_KEY_PREFIX)) {
          const key = storageKey.substring(STATE_KEY_PREFIX.length);
          const json = localStorage.getItem(storageKey);
          if (json) {
            const value = JSON.parse(json);
            this.cache.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load state from storage:', error);
    }
  }
}

