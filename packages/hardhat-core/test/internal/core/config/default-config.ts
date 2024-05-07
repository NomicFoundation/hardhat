import { assert } from "chai";

import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import { HardforkName } from "../../../../src/internal/util/hardforks";

describe("Default config", function () {
  it("should include block numbers for all hardforks", async function () {
    const mainnetChainConfig = defaultHardhatNetworkParams.chains.get(1);

    if (mainnetChainConfig === undefined) {
      assert.fail("Mainnet entry should exist");
    }

    const history = mainnetChainConfig.hardforkHistory;

    for (const hardfork of Object.values(HardforkName)) {
      const hardforkHistoryEntry = history.get(hardfork);
      assert.isDefined(
        hardforkHistoryEntry,
        `No hardfork history entry for ${hardfork}`
      );
    }
  });
});
