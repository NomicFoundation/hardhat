import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  getCurrentHardfork,
  L1HardforkName,
  OpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  getHardforkName,
  warnIfExperimentalHardfork,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/hardfork.js";
import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../../../src/internal/constants.js";

describe("warnIfExperimentalHardfork", () => {
  let warnings: string[];

  const warn = (message: string) => {
    warnings.push(message);
  };

  beforeEach(() => {
    warnings = [];
  });

  it("does not warn for the latest stable hardfork", () => {
    warnIfExperimentalHardfork(
      getCurrentHardfork(L1_CHAIN_TYPE),
      L1_CHAIN_TYPE,
      warn,
    );

    assert.equal(warnings.length, 0);
  });

  it("does not warn for hardforks earlier than the latest stable one", () => {
    warnIfExperimentalHardfork(L1HardforkName.LONDON, L1_CHAIN_TYPE, warn);
    warnIfExperimentalHardfork(L1HardforkName.PRAGUE, L1_CHAIN_TYPE, warn);

    assert.equal(warnings.length, 0);
  });

  it("warns exactly once for an experimental hardfork, then dedupes", () => {
    warnIfExperimentalHardfork(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE, warn);

    assert.equal(warnings.length, 1);
    assert.ok(
      warnings[0].includes(L1HardforkName.AMSTERDAM),
      "warning should mention the selected experimental hardfork",
    );
    assert.ok(
      warnings[0].includes(getCurrentHardfork(L1_CHAIN_TYPE)),
      "warning should mention the latest stable hardfork",
    );

    // Repeated calls for the same (chainType, hardfork) are deduped.
    warnIfExperimentalHardfork(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE, warn);

    assert.equal(warnings.length, 1);
  });
});

describe("getHardforkName", () => {
  it("resolves L1 names for both the l1 and generic chain types", () => {
    assert.equal(
      getHardforkName(L1HardforkName.CANCUN, L1_CHAIN_TYPE),
      L1HardforkName.CANCUN,
    );

    assert.equal(
      getHardforkName(L1HardforkName.CANCUN, GENERIC_CHAIN_TYPE),
      L1HardforkName.CANCUN,
    );
  });

  it("resolves OP names for the OP chain type", () => {
    assert.equal(
      getHardforkName(OpHardforkName.ECOTONE, OPTIMISM_CHAIN_TYPE),
      OpHardforkName.ECOTONE,
    );
  });

  it("rejects a name belonging to the other chain type", () => {
    assertThrowsHardhatError(
      () => getHardforkName(L1HardforkName.CANCUN, OPTIMISM_CHAIN_TYPE),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: `Invalid hardfork name ${L1HardforkName.CANCUN}` },
    );

    assertThrowsHardhatError(
      () => getHardforkName(OpHardforkName.ECOTONE, L1_CHAIN_TYPE),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: `Invalid hardfork name ${OpHardforkName.ECOTONE}` },
    );
  });

  it("rejects a pre-Byzantium L1 name", () => {
    assertThrowsHardhatError(
      () => getHardforkName("chainstart", L1_CHAIN_TYPE),
      HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
      { message: "Invalid hardfork name chainstart" },
    );
  });
});
