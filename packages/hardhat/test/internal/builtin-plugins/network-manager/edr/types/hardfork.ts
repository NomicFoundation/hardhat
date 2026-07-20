import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { l1HardforkLatest, opLatestHardfork } from "@nomicfoundation/edr";

import {
  getCurrentHardfork,
  isValidHardforkName,
  L1HardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  edrL1HardforkToHardhatL1HardforkName,
  edrOpHardforkToHardhatOpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/convert-to-edr.js";
import {
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../../../src/internal/constants.js";

// `getCurrentHardfork` returns a hardcoded latest-stable marker instead of
// asking `@nomicfoundation/edr` at runtime (keeping the native addon off the
// bootstrap path — see commit 2568ed1ba). The marker is NOT necessarily the
// last enum entry: the enum can contain experimental forks (e.g. Amsterdam)
// that EDR ships but hasn't promoted to latest. These tests guard the
// invariant: if someone bumps EDR to a version that promotes a new hardfork
// but forgets to bump the marker in hardfork.ts, these assertions fail.
describe("getCurrentHardfork invariant with @nomicfoundation/edr", () => {
  it("L1: latest-stable marker matches EDR's l1HardforkLatest()", () => {
    const fromEdr = edrL1HardforkToHardhatL1HardforkName(l1HardforkLatest());
    assert.equal(getCurrentHardfork(L1_CHAIN_TYPE), fromEdr);
  });

  it("OP: latest-stable marker matches EDR's opLatestHardfork()", () => {
    const fromEdr = edrOpHardforkToHardhatOpHardforkName(opLatestHardfork());
    assert.equal(getCurrentHardfork(OPTIMISM_CHAIN_TYPE), fromEdr);
  });
});

describe("Amsterdam is a selectable L1 hardfork", () => {
  it("is a valid L1 hardfork name", () => {
    assert.equal(
      isValidHardforkName(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE),
      true,
    );
  });
});
