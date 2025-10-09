/**
 * PARTICLESYSTEM/physic/structuredarray.ts - GPU buffer helper for structured data
 * Single responsibility: Typed buffer management for compute shaders
 */

import { struct, instancedArray } from "three/tsl";

const TYPES = {
  int: { size: 1, alignment: 1, isFloat: false },
  uint: { size: 1, alignment: 1, isFloat: false },
  float: { size: 1, alignment: 1, isFloat: true },

  vec2: { size: 2, alignment: 2, isFloat: true },
  ivec2: { size: 2, alignment: 2, isFloat: false },
  uvec2: { size: 2, alignment: 2, isFloat: false },

  vec3: { size: 3, alignment: 4, isFloat: true },
  ivec3: { size: 3, alignment: 4, isFloat: false },
  uvec3: { size: 3, alignment: 4, isFloat: false },

  vec4: { size: 4, alignment: 4, isFloat: true },
  ivec4: { size: 4, alignment: 4, isFloat: false },
  uvec4: { size: 4, alignment: 4, isFloat: false },

  mat2: { size: 4, alignment: 2, isFloat: true },
  mat3: { size: 12, alignment: 4, isFloat: true },
  mat4: { size: 16, alignment: 4, isFloat: true },
};

type TypeName = keyof typeof TYPES;

interface LayoutMember {
  type: TypeName;
  atomic?: boolean;
}

type LayoutDefinition = Record<string, LayoutMember | TypeName>;

interface ParsedMember {
  type: TypeName;
  atomic?: boolean;
  size: number;
  alignment: number;
  isFloat: boolean;
  offset: number;
}

type ParsedLayout = Record<string, ParsedMember>;

/**
 * StructuredArray - Helper for managing structured GPU buffers
 * Handles alignment, atomic operations, and TSL integration
 */
export class StructuredArray {
  public readonly structNode: any;
  public readonly buffer: any;
  public readonly length: number;
  public readonly structSize: number;

  private layout: ParsedLayout;
  private floatArray: Float32Array;
  private intArray: Int32Array;

  constructor(layout: LayoutDefinition, length: number, label: string) {
    this.length = length;
    this.layout = this._parse(layout);

    this.structNode = struct(this.layout);
    this.floatArray = new Float32Array(this.structSize * this.length);
    this.intArray = new Int32Array(this.floatArray.buffer);
    this.buffer = instancedArray(this.floatArray, this.structNode).label(label);
  }

  /**
   * Enable/disable atomic operations for a specific element
   */
  public setAtomic(element: string, value: boolean): void {
    const index = Object.keys(this.layout).findIndex((k) => k === element);
    if (index >= 0) {
      this.buffer.structTypeNode.membersLayout[index].atomic = value;
    }
  }

  /**
   * Set a value in the buffer (CPU-side)
   */
  public set(index: number, element: string, value: number | number[] | { x: number; y?: number; z?: number; w?: number }): void {
    const member = this.layout[element];
    if (!member) {
      return;
    }

    const offset = index * this.structSize + member.offset;
    const array = member.isFloat ? this.floatArray : this.intArray;

    if (member.size === 1) {
      if (typeof value !== 'number') {
        return;
      }
      array[offset] = value;
    } else if (member.size > 1) {
      let arr: number[];
      if (typeof value === 'object' && !Array.isArray(value)) {
        arr = [value.x, value.y || 0, value.z || 0, value.w || 0];
      } else if (Array.isArray(value)) {
        arr = value;
      } else {
        return;
      }

      if (arr.length < member.size) {
        return;
      }

      for (let i = 0; i < member.size; i++) {
        array[offset + i] = arr[i];
      }
    }
  }

  /**
   * Get element reference for TSL
   */
  public element(index: any): any {
    return this.buffer.element(index);
  }

  /**
   * Get element property for TSL
   */
  public get(index: any, element: string): any {
    return this.buffer.element(index).get(element);
  }

  /**
   * Parse layout definition into aligned structure
   */
  private _parse(layout: LayoutDefinition): ParsedLayout {
    let offset = 0;
    const parsedLayout: ParsedLayout = {};

    const keys = Object.keys(layout);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let member = layout[key];

      // Convert string to object format
      if (typeof member === 'string') {
        member = { type: member as TypeName };
      }

      const type = member.type;
      if (!TYPES[type]) {
        continue;
      }

      const { size, alignment, isFloat } = TYPES[type];

      // Apply alignment padding
      const rest = offset % alignment;
      if (rest !== 0) {
        offset += alignment - rest;
      }

      parsedLayout[key] = {
        type,
        atomic: member.atomic,
        size,
        isFloat,
        alignment,
        offset,
      };

      offset += size;
    }

    // Align struct size to vec4 (16 bytes / 4 floats)
    const rest = offset % 4;
    if (rest !== 0) {
      offset += 4 - rest;
    }

    this.structSize = offset;
    return parsedLayout;
  }
}

