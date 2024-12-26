/**
 * Converts a string, number, or Date object to a Unix timestamp (seconds since the Unix Epoch).
 *
 * @param value The string to convert.
 * @returns The Unix timestamp.
 */
export function toSeconds(value: string | number | Date): number {
  return Math.floor(new Date(value).getTime() / 1000);
}

/**
 * Converts a Unix timestamp to a Date object.
 *
 * @param timestamp The Unix timestamp to convert.
 * @returns The Date object.
 */
export function secondsToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Gets the current Unix timestamp (seconds since the Unix Epoch).
 *
 * @returns The current Unix timestamp.
 */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}
