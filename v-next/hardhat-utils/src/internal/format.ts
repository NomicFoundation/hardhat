export function getStringWidth(str: string): number {
  // Remove ANSI escape codes if present
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, "");
  return stripped.length;
}
