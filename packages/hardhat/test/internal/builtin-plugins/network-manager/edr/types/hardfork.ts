import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  L1Hardfork,
  l1HardforkFromString,
  l1HardforkLatest,
  l1HardforkToString,
  OpHardfork,
  opHardforkFromString,
  opHardforkToString,
  opLatestHardfork,
} from "@nomicfoundation/edr";

import {
  getCurrentHardfork,
  getHardforks,
  isValidHardforkName,
  L1HardforkName,
  OpHardforkName,
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

describe("pre-Byzantium L1 hardforks are not selectable", () => {
  const PRE_BYZANTIUM = [
    "chainstart",
    "homestead",
    "dao",
    "tangerineWhistle",
    "spuriousDragon",
  ];

  it("are not valid L1 hardfork names", () => {
    for (const hardfork of PRE_BYZANTIUM) {
      assert.equal(
        isValidHardforkName(hardfork, L1_CHAIN_TYPE),
        false,
        `${hardfork} should not be a valid L1 hardfork name`,
      );
    }
  });

  it("byzantium is the oldest supported L1 hardfork", () => {
    assert.equal(getHardforks(L1_CHAIN_TYPE)[0], L1HardforkName.BYZANTIUM);
  });
});

describe("Hardhat and EDR agree on hardfork names", () => {
  function edrL1Hardforks(): L1Hardfork[] {
    return Object.getOwnPropertyNames(L1Hardfork).map(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- the names come from the enum object itself, so they index it safely */
      (variant) => L1Hardfork[variant as keyof typeof L1Hardfork],
    );
  }

  function edrOpHardforks(): OpHardfork[] {
    return Object.getOwnPropertyNames(OpHardfork).map(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- the names come from the enum object itself, so they index it safely */
      (variant) => OpHardfork[variant as keyof typeof OpHardfork],
    );
  }

  describe("L1", () => {
    it("every Hardhat hardfork name is one EDR accepts", () => {
      for (const name of Object.values(L1HardforkName)) {
        assert.equal(
          l1HardforkToString(l1HardforkFromString(name)),
          name,
          `EDR does not round-trip the L1 hardfork name "${name}"`,
        );
      }
    });

    it("every EDR hardfork has a Hardhat name", () => {
      for (const hardfork of edrL1Hardforks()) {
        const name = l1HardforkToString(hardfork);
        assert.equal(
          isValidHardforkName(name, L1_CHAIN_TYPE),
          true,
          `EDR supports the L1 hardfork "${name}" but Hardhat has no name for it`,
        );
      }
    });
  });

  describe("OP", () => {
    it("every Hardhat hardfork name is one EDR accepts", () => {
      for (const name of Object.values(OpHardforkName)) {
        assert.equal(
          opHardforkToString(opHardforkFromString(name)),
          name,
          `EDR does not round-trip the OP hardfork name "${name}"`,
        );
      }
    });

    it("every EDR hardfork has a Hardhat name", () => {
      for (const hardfork of edrOpHardforks()) {
        const name = opHardforkToString(hardfork);
        assert.equal(
          isValidHardforkName(name, OPTIMISM_CHAIN_TYPE),
          true,
          `EDR supports the OP hardfork "${name}" but Hardhat has no name for it`,
        );
      }
    });
  });
});
