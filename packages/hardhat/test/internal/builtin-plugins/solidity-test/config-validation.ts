import type { HardhatUserConfig } from "../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

describe("config validation", () => {
  it("should accept a flat `test.solidity` config", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      test: {
        solidity: {
          isolate: true,
        },
      },
    });

    assert.equal(hre.config.test.solidity.profiles.default.isolate, true);
  });

  it("should not throw when the `test.solidity` config is not set by the user", async () => {
    await createHardhatRuntimeEnvironment({ test: {} });
  });

  it("should throw when the `test.solidity` properties are invalid", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- intentionally violating the types for the test */
        solidity: {
          isolate: "not a boolean",
        } as any,
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.isolate: Expected boolean, received string",
      },
    );
  });

  it("should accept a `profiles` wrapper with a `default` profile", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      test: {
        solidity: {
          profiles: {
            default: {
              isolate: true,
            },
          },
        },
      },
    });

    assert.equal(hre.config.test.solidity.profiles.default.isolate, true);
  });

  it("should throw when the `profiles` wrapper is missing the `default` profile", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        solidity: {
          profiles: {
            ci: { isolate: true },
          },
        },
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.profiles: A `default` profile is required when using `profiles`",
      },
    );
  });

  it("should throw when the `profiles` wrapper has a non-`default` profile", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        solidity: {
          profiles: {
            default: { isolate: true },
            ci: { isolate: false },
          },
        },
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.profiles: Only the `default` profile is supported. Other profile names will be supported in a future release.",
      },
    );
  });

  it("should throw when `profiles` is mixed with flat fields", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- intentionally violating the types for the test */
        solidity: {
          profiles: { default: { isolate: true } },
          fuzz: { runs: 50 },
        } as any,
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.profiles: This field is incompatible with the flat solidity test config",
      },
    );
  });

  it("should reject bigint fuzz timeouts that cannot be represented as safe numbers", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        solidity: {
          fuzz: { timeout: BigInt(Number.MAX_SAFE_INTEGER) + 1n },
        },
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.fuzz.timeout: Expected a nonnegative safe int or a nonnegative safe bigint",
      },
    );
  });

  it("should reject bigint invariant timeouts that cannot be represented as safe numbers", async () => {
    const userConfig: HardhatUserConfig = {
      test: {
        solidity: {
          profiles: {
            default: {
              invariant: { timeout: BigInt(Number.MAX_SAFE_INTEGER) + 1n },
            },
          },
        },
      },
    };

    await assertRejectsWithHardhatError(
      createHardhatRuntimeEnvironment(userConfig),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG,
      {
        errors:
          "\t* Config error in config.test.solidity.profiles.default.invariant.timeout: Expected a nonnegative safe int or a nonnegative safe bigint",
      },
    );
  });
});
