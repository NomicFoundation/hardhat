import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  getCurrentHardfork,
  L1HardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import { warnIfExperimentalHardfork } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/hardfork.js";
import { L1_CHAIN_TYPE } from "../../../../../../src/internal/constants.js";

describe("warnIfExperimentalHardfork", () => {
  let originalWarn: typeof console.warn;
  let warnings: string[];

  beforeEach(() => {
    originalWarn = console.warn;
    warnings = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  it("does not warn for the latest stable hardfork", () => {
    warnIfExperimentalHardfork(
      getCurrentHardfork(L1_CHAIN_TYPE),
      L1_CHAIN_TYPE,
    );
    assert.equal(warnings.length, 0);
  });

  it("does not warn for hardforks earlier than the latest stable one", () => {
    warnIfExperimentalHardfork(L1HardforkName.LONDON, L1_CHAIN_TYPE);
    warnIfExperimentalHardfork(L1HardforkName.PRAGUE, L1_CHAIN_TYPE);
    assert.equal(warnings.length, 0);
  });

  it("warns exactly once for an experimental hardfork, then dedupes", () => {
    warnIfExperimentalHardfork(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE);
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
    warnIfExperimentalHardfork(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE);
    assert.equal(warnings.length, 1);
  });
});
