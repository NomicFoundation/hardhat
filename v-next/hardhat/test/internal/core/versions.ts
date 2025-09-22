import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatRuntimeEnvironmentImplementation } from "../../../src/internal/core/hre.js";
import {
  getEdrVersion,
  getHardhatVersion,
} from "../../../src/internal/utils/package.js";

describe("Hardhat runtime Environment versions", () => {
  it("Hardhat and EDR versions", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});
    assert.equal(hre.versions.hardhatVersion, await getHardhatVersion());
    assert.equal(hre.versions.edrVersion, await getEdrVersion());
  });
});
