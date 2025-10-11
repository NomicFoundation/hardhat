/**
 * Calculate the display width of a string by removing ANSI escape codes.
 *
 * NOTE: This implementation only removes basic ANSI color/style codes and may
 * not handle all escape sequences (e.g., cursor movement, complex control
 * sequences).
 */
export function getStringWidth(str: string): number {
  // Remove ANSI escape codes if present
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, "");
  return stripped.length;
}
