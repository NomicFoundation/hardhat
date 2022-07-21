import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { deployModules } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("chain id", () => {
  useEnvironment("minimal");

  it("should be available on the module builder", async function () {
    // given
    const chainIdModule = buildModule("MyModule", (m) => {
      assert.equal(m.chainId, 31337);
    });

    await deployModules(this.hre, [chainIdModule], [1, 1]);
  });
});
