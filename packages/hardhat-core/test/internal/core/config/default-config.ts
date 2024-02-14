import { assert } from "chai";

import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import { HardforkName } from "../../../../src/internal/util/hardforks";

describe("Default config", function () {
  it("should include block numbers for all hardforks", async function () {
    const mainnetChainConfig = defaultHardhatNetworkParams.chains.get(1);

    if (mainnetChainConfig === undefined) {
      assert.fail("Mainnet entry should exist");
    }

    for (const hardfork of Object.values(HardforkName)) {
      if (hardfork === HardforkName.CANCUN) {
        // temporarily skipped until Cancun is enabled in mainnet
        continue;
      }

      const hardforkHistoryEntry =
        mainnetChainConfig.hardforkHistory.get(hardfork);
      assert.isDefined(
        hardforkHistoryEntry,
        `No hardfork history entry for ${hardfork}`
      );
    }
  });
});
