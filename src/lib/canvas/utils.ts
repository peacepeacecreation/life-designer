/**
 * Canvas utility functions
 */

/**
 * Generates a unique UUID for canvas nodes
 * Uses crypto.randomUUID() for full uniqueness without collisions
 */
export function generateNodeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a unique UUID for prompts
 * Uses the same UUID generation logic as nodes
 */
export function generatePromptId(): string {
  return generateNodeId();
}
