import assert from "node:assert/strict";
import { describe, it } from "node:test";

import HardhatTestPlugin from "../../../../src/internal/builtin-plugins/test/index.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";

describe("test/config", function () {
  it("should initialize the `test` object if none is provided provided", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatTestPlugin],
    });

    assert.ok(
      hre.config.test !== null && typeof hre.config.test === "object",
      "hre.config.test should be an object, to allow plugins to extend",
    );
  });

  it("should keep the existing `test` config  provided", async () => {
    const existingTestConfig = {
      solidity: {
        timeout: 123,
      },
    };

    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatTestPlugin],
      test: existingTestConfig,
    });

    assert.equal(
      hre.config.test.solidity.timeout,
      existingTestConfig.solidity.timeout,
    );
  });
});
