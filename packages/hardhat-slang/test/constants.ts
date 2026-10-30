import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import { getSlangAssetName } from "../src/internal/platform.js";
import { getLatestSlangVersion } from "../src/internal/utils/slang-release-version.js";

describe("SLANG_RELEASES", () => {
  // Each row is the newest of itself and the rows after it. This also checks
  // that every key follows the release version format, that no two keys name
  // the same release time, and that the first row is the latest release.
  it("lists releases newest first", () => {
    const entries = Object.entries(SLANG_RELEASES);

    for (let i = 0; i < entries.length; i++) {
      assert.equal(
        getLatestSlangVersion(Object.fromEntries(entries.slice(i))),
        entries[i][0],
        `${entries[i][0]} should be newer than every row after it`,
      );
    }
  });

  // Copying the previous row for a new release and keeping its asset suffix
  // would silently download the old binary under the new key.
  it("downloads a different mirror asset for every release", () => {
    const releaseByAsset = new Map<string, string>();

    for (const [version, release] of Object.entries(SLANG_RELEASES)) {
      const asset = getSlangAssetName(version, release);

      assert.equal(
        releaseByAsset.get(asset),
        undefined,
        `${releaseByAsset.get(asset)} and ${version} both download ${asset}`,
      );

      releaseByAsset.set(asset, version);
    }
  });
});
