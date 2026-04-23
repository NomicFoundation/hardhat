import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { l1HardforkLatest, opLatestHardfork } from "@nomicfoundation/edr";

import { getCurrentHardfork } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  edrL1HardforkToHardhatL1HardforkName,
  edrOpHardforkToHardhatOpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/convert-to-edr.js";
import {
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../../../src/internal/constants.js";

// `getCurrentHardfork` returns the last value of the hardfork enum
// instead of asking `@nomicfoundation/edr` at runtime (keeping the native
// addon off the bootstrap path). These tests guard the invariant: if
// someone bumps EDR to a version that adds a new hardfork but forgets to
// append it to the enum in hardfork.ts, these assertions fail.
describe("getCurrentHardfork invariant with @nomicfoundation/edr", () => {
  it("L1: enum's last value matches EDR's l1HardforkLatest()", () => {
    const fromEdr = edrL1HardforkToHardhatL1HardforkName(l1HardforkLatest());
    assert.equal(getCurrentHardfork(L1_CHAIN_TYPE), fromEdr);
  });

  it("OP: enum's last value matches EDR's opLatestHardfork()", () => {
    const fromEdr = edrOpHardforkToHardhatOpHardforkName(opLatestHardfork());
    assert.equal(getCurrentHardfork(OPTIMISM_CHAIN_TYPE), fromEdr);
  });
});
