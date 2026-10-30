import type { SlangRelease } from "../../src/internal/constants.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { SLANG_RELEASES } from "../../src/internal/constants.js";
import { getLatestSlangVersion } from "../../src/internal/utils/slang-release-version.js";

const RELEASE: SlangRelease = { minSolidity: "0.8.0", maxSolidity: "0.8.37" };

// A release table with the given keys, in the given order
function releases(...versions: string[]): Record<string, SlangRelease> {
  return Object.fromEntries(versions.map((version) => [version, RELEASE]));
}

describe("getLatestSlangVersion", () => {
  it("reads SLANG_RELEASES by default", () => {
    assert.equal(getLatestSlangVersion(), Object.keys(SLANG_RELEASES)[0]);
  });

  it("returns the first release of a table listed newest first", () => {
    assert.equal(
      getLatestSlangVersion(
        releases(
          "0.1.0-pre.2026-10-29",
          "0.1.0-pre.2026-10-14",
          "0.1.0-pre.2026-10-01",
        ),
      ),
      "0.1.0-pre.2026-10-29",
    );
  });

  it("returns the newest date, whatever the table order", () => {
    assert.equal(
      getLatestSlangVersion(
        releases(
          "0.1.0-pre.2026-10-14",
          "0.1.0-pre.2026-10-29",
          "0.1.0-pre.2026-10-01",
          "0.1.0-pre.2026-09-30",
        ),
      ),
      "0.1.0-pre.2026-10-29",
    );
  });

  it("compares the version before the date", () => {
    assert.equal(
      getLatestSlangVersion(
        releases(
          "0.1.0-pre.2027-01-01",
          "0.2.0-pre.2026-10-29",
          "0.1.0-pre.2026-12-31T23-59-59",
        ),
      ),
      "0.2.0-pre.2026-10-29",
    );
  });

  it("compares versions as numbers, not text", () => {
    assert.equal(
      getLatestSlangVersion(
        releases("0.10.0-pre.2026-10-29", "0.9.0-pre.2026-10-29"),
      ),
      "0.10.0-pre.2026-10-29",
    );
  });

  it("compares the time of releases on the same day", () => {
    assert.equal(
      getLatestSlangVersion(
        releases(
          "0.1.0-pre.2026-10-29T13",
          "0.1.0-pre.2026-10-29",
          "0.1.0-pre.2026-10-29T13-45-07",
          "0.1.0-pre.2026-10-29T09-59-59",
          "0.1.0-pre.2026-10-29T13-45",
        ),
      ),
      "0.1.0-pre.2026-10-29T13-45-07",
    );
  });

  it("rejects an empty table", () => {
    assertThrowsHardhatError(
      () => getLatestSlangVersion({}),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: "No slang releases are known" },
    );
  });

  for (const version of [
    "0.1.0",
    "0.1.0-pre",
    "0.1.0-pre.2026-1-29",
    "0.1.0-alpha.2026-10-29",
    "0.1.0-pre.2026-10-29T13:45:07",
    "0.1.0-pre.2026-13-29",
    "0.1.0-pre.2026-10-32",
    "0.1.0-pre.2026-10-29T24",
    "0.1.0-pre.2026-10-29T13-60",
    "0.1.0-pre.2026-10-29T13-45-60",
  ]) {
    it(`rejects the release version ${version}`, () => {
      assertThrowsHardhatError(
        () => getLatestSlangVersion(releases("0.1.0-pre.2026-10-29", version)),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        { message: `Invalid slang release version: ${version}` },
      );
    });
  }

  it("rejects two releases at the same time, treating a missing time part as zero", () => {
    assertThrowsHardhatError(
      () =>
        getLatestSlangVersion(
          releases("0.1.0-pre.2026-10-29T13", "0.1.0-pre.2026-10-29T13-00-00"),
        ),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      {
        message:
          "Slang releases 0.1.0-pre.2026-10-29T13 and 0.1.0-pre.2026-10-29T13-00-00 name the same release time",
      },
    );
  });

  it("rejects an invalid release version even when it is the only row", () => {
    assertThrowsHardhatError(
      () => getLatestSlangVersion(releases("0.1.0")),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: "Invalid slang release version: 0.1.0" },
    );
  });
});
