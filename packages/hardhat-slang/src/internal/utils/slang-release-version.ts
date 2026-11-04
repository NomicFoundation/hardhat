import type { SlangRelease } from "../constants.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { SLANG_RELEASES } from "../constants.js";

/**
 * A slang release version as used for the keys of `SLANG_RELEASES`:
 * `<major>.<minor>.<patch>-pre.<YYYY>-<MM>-<DD>`, optionally followed by
 * `T<HH>`, `T<HH>-<mm>` or `T<HH>-<mm>-<ss>` for a second release on the same
 * day. `:` isn't allowed in a semver prerelease, hence the hyphens.
 */
const SLANG_RELEASE_VERSION_REGEX =
  /^(\d+)\.(\d+)\.(\d+)-pre\.(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(?:-(\d{2})(?:-(\d{2}))?)?)?$/;

/**
 * The parts of a slang release version, in the order they are compared:
 * major, minor, patch, then the release's year, month, day, hour, minute and
 * second. A missing time part counts as zero.
 */
type SlangReleaseVersion = [
  major: number,
  minor: number,
  patch: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
];

/**
 * Returns the newest release in the given release table, `SLANG_RELEASES` by
 * default. Every key must follow the release version format, and no two keys
 * may name the same release time.
 */
export function getLatestSlangVersion(
  releases: Record<string, SlangRelease> = SLANG_RELEASES,
): string {
  const versions = Object.keys(releases).map((version) => {
    const parsed = parseSlangReleaseVersion(version);

    assertHardhatInvariant(
      parsed !== undefined,
      `Invalid slang release version: ${version}`,
    );

    return { version, parsed };
  });

  assertHardhatInvariant(versions.length > 0, "No slang releases are known");

  const seen = new Map<string, string>();
  for (const { version, parsed } of versions) {
    const key = parsed.join(".");
    const other = seen.get(key);

    assertHardhatInvariant(
      other === undefined,
      `Slang releases ${other} and ${version} name the same release time`,
    );

    seen.set(key, version);
  }

  return versions.reduce((latest, candidate) =>
    compareSlangReleaseVersions(candidate.parsed, latest.parsed) > 0
      ? candidate
      : latest,
  ).version;
}

/**
 * Parses a slang release version, returning `undefined` if it doesn't follow
 * the `SLANG_RELEASES` key format or names an impossible date or time.
 */
function parseSlangReleaseVersion(
  version: string,
): SlangReleaseVersion | undefined {
  const match = SLANG_RELEASE_VERSION_REGEX.exec(version);

  if (match === null) {
    return undefined;
  }

  const [major, minor, patch, year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => (part === undefined ? 0 : Number(part)));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined;
  }

  return [major, minor, patch, year, month, day, hour, minute, second];
}

/**
 * Compares two parsed slang release versions, returning a negative number if
 * `a` is older than `b`, a positive number if it is newer, and zero if they
 * are equal.
 */
function compareSlangReleaseVersions(
  a: SlangReleaseVersion,
  b: SlangReleaseVersion,
): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }

  return 0;
}
