export const clamp01 = (value) => Math.max(0, Math.min(1, value ?? 0));

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value ?? min));
