/**
 * Shared type definitions for FlowApp orchestration modules.
 */

/**
 * Callback invoked when initialization progress updates.
 * @param fraction A number between 0 and 1 representing overall completion.
 * @param delay Optional delay (ms) before the callback resolves.
 */
export type ProgressCallback = (fraction: number, delay?: number) => Promise<void>;
