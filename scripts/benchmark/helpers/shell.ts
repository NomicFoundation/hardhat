/**
 * Shell primitives shared by the benchmark runner and its measurement
 * wrappers.
 */

// Absolute path: a scenario env may replace PATH with one that has no bash.
export const BASH = "/bin/bash";

/** Quote a value for safe interpolation into a bash command line. */
export function shellQuote(value: string): string {
  if (/^[\w@./:=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}
