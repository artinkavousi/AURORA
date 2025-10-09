# 🚀 Sprint 2: Sparse Grid Optimization

**Goal**: Reduce grid update time by 50% by skipping empty cells

## 📊 Problem Analysis

### Current Implementation
```
Grid Size: 64×64×64 = 262,144 cells
Active Cells (with particles): ~5-15% (13K-39K cells)
Wasted Computation: 85-95% (processing empty cells)
```

### Bottleneck
- **Grid Update kernel** processes ALL cells
- Most cells are empty (no particles nearby)
- Computing forces/pressure for empty cells = wasted GPU cycles

### Solution: Sparse Grid
Only process cells that have particles in or near them!

---

## 🎯 Implementation Strategy

### Phase 1: Active Cell Marking
**Goal**: Tag which cells have particles

```glsl
// In P2G pass (already looping over particles):
for each particle:
  cellIndex = getCellIndex(particle.position)
  activeCellBuffer[cellIndex] = 1  // Mark as active
```

### Phase 2: Compact Active List
**Goal**: Build list of active cell indices

```glsl
// Parallel prefix sum to compact indices:
activeCellList = [idx for idx in cells if activeCellBuffer[idx] == 1]
```

### Phase 3: Sparse Update
**Goal**: Only update active cells

```glsl
// Grid update - sparse version:
for each activeCellIndex in activeCellList:
  updateCell(activeCellIndex)  // Only process active cells!
```

---

## 🔧 Technical Details

### New Buffers Needed
1. **activeCellFlags**: `instancedArray(cellCount, 'int')` - 1 if active, 0 if empty
2. **activeCellCount**: `uniform(0, 'uint')` - Number of active cells
3. **activeCellIndices**: `instancedArray(cellCount, 'uint')` - Compact list of indices

### Kernel Modifications

#### 1. Modified P2G (mark cells)
```typescript
// After writing to grid, mark cell as active
const cellPtr = getCellPtr(cellPos);
this.activeCellFlags.element(cellPtr).assign(int(1));
```

#### 2. New Kernel: Build Active List
```typescript
this.kernels.buildActiveList = Fn(() => {
  // Parallel scan to build compact list
  // Uses atomic counter for active cells
})
```

#### 3. Modified UpdateGrid (sparse)
```typescript
this.kernels.updateGridSparse = Fn(() => {
  // Only process cells in activeCellIndices list
  const activeIdx = this.activeCellIndices.element(instanceIndex);
  // ... update cell at activeIdx
})
```

---

## 📈 Expected Performance Gain

| Scenario | Active Cells | Speedup |
|----------|-------------|---------|
| Dense (centered) | 30% | 1.4x |
| Normal (spread) | 15% | 2.0x |
| Sparse (edges) | 5% | 5.0x |

**Average**: **2x faster grid updates** ✨

---

## 🎛️ Control Panel Addition

```typescript
advFolder.addBinding(config.simulation, "sparseGrid", {
  label: "⚡ Sparse Grid",
});
```

**Default**: Enabled (performance benefit with no quality loss)

---

## 🐛 Edge Cases to Handle

1. **Boundary Cells**: Mark neighbors of particle cells (for force propagation)
2. **Vorticity Spread**: Need 3×3×3 neighborhood marked
3. **Empty Frames**: Handle when no particles exist
4. **Memory**: Active list size = worst-case cellCount

---

## ✅ Success Criteria

- [ ] activeCellFlags buffer created
- [ ] P2G marks cells as active
- [ ] Active list built per frame
- [ ] UpdateGrid uses sparse version
- [ ] Toggle added to UI
- [ ] Performance improves by >40%
- [ ] No visual artifacts

---

Let's implement this! 🚀

