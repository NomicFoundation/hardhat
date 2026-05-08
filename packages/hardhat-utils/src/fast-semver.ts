/**
 * A small, fast subset of semver: strict `MAJOR.MINOR.PATCH` parsing and
 * triple-wise comparison helpers.
 *
 * This module exists because the full `semver` package is slow to load and is
 * overkill for the many call sites in Hardhat that compare against hard-coded
 * `x.y.z` literals. For range grammar (caret/tilde, disjunctions, prerelease
 * subset, etc.) keep using `semver`.
 */

export type SemverVersion = [major: number, minor: number, patch: number];

const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Parses a strict `MAJOR.MINOR.PATCH` version string into a `SemverVersion`
 * tuple.
 *
 * An optional `+build` suffix is accepted and stripped silently. A
 * `-prerelease` suffix is rejected.
 *
 * @param version The version string to parse.
 * @returns The parsed `SemverVersion`, or `undefined` if the input does not
 * match the strict `\d+\.\d+\.\d+` shape.
 */
export function parseVersion(version: string): SemverVersion | undefined {
  const match = VERSION_REGEX.exec(version);
  if (match === null) {
    return undefined;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * `Array#sort`-style comparator for `SemverVersion` tuples: returns a negative
 * number, zero, or a positive number depending on whether `a` is lower than,
 * equal to, or greater than `b`.
 */
export function compare(a: SemverVersion, b: SemverVersion): number {
  if (a[0] !== b[0]) {
    return a[0] - b[0];
  }
  if (a[1] !== b[1]) {
    return a[1] - b[1];
  }
  return a[2] - b[2];
}

/**
 * Returns `true` if `a` and `b` represent the same `MAJOR.MINOR.PATCH`.
 */
export function equals(a: SemverVersion, b: SemverVersion): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * Returns `true` if `compared` is strictly lower than `comparator`.
 */
export function lowerThan(
  compared: SemverVersion,
  comparator: SemverVersion,
): boolean {
  return compare(compared, comparator) < 0;
}

/**
 * Returns `true` if `compared` is lower than or equal to `comparator`.
 */
export function lowerThanOrEqual(
  compared: SemverVersion,
  comparator: SemverVersion,
): boolean {
  return compare(compared, comparator) <= 0;
}

/**
 * Returns `true` if `compared` is strictly greater than `comparator`.
 */
export function greaterThan(
  compared: SemverVersion,
  comparator: SemverVersion,
): boolean {
  return compare(compared, comparator) > 0;
}

/**
 * Returns `true` if `compared` is greater than or equal to `comparator`.
 */
export function greaterThanOrEqual(
  compared: SemverVersion,
  comparator: SemverVersion,
): boolean {
  return compare(compared, comparator) >= 0;
}
