import type { HardhatUserConfig } from "../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("coverage config", () => {
  it("should default `skipFiles` to an empty array when not set", async () => {
    const hre = await createHardhatRuntimeEnvironment({});

    assert.deepEqual(hre.config.coverage.skipFiles, []);
  });

  it("should resolve user-provided `skipFiles`", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      coverage: {
        skipFiles: ["**/mocks/**"],
      },
    });

    assert.deepEqual(hre.config.coverage.skipFiles, ["**/mocks/**"]);
  });

  it("should throw when `skipFiles` is not an array of strings", async () => {
    const userConfig: HardhatUserConfig = {
      coverage: {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- intentionally violating the types for the test */
        skipFiles: "not an array" as any,
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.coverage.skipFiles: Expected array, received string",
      },
    );
  });
});
