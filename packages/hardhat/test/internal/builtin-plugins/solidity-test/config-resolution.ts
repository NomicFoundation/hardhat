import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  DEFAULT_FUZZ_SEED,
  resolveFuzzConfig,
} from "../../../../src/internal/builtin-plugins/solidity-test/config.js";

describe("config resolution", () => {
  describe("resolveFuzzConfig", () => {
    it("should return default seed when solidity test fuzz config is undefined", () => {
      const result = resolveFuzzConfig(undefined);

      assert.deepEqual(result, { seed: DEFAULT_FUZZ_SEED });
    });

    it("should return default seed when solidity test fuzz config is empty", () => {
      const result = resolveFuzzConfig({});

      assert.deepEqual(result, { seed: DEFAULT_FUZZ_SEED });
    });

    it("should return default seed when the seed is undefined", () => {
      const result = resolveFuzzConfig({ seed: undefined });

      assert.deepEqual(result, { seed: DEFAULT_FUZZ_SEED });
    });

    it("should use provided seed when specified", () => {
      const customSeed = "0xabc123";
      const result = resolveFuzzConfig({ seed: customSeed });

      assert.ok(result !== undefined, "result is undefined");
      assert.equal(result.seed, customSeed);
    });

    it("should preserve other fuzz config properties", () => {
      const result = resolveFuzzConfig({
        runs: 500,
        maxTestRejects: 100,
        dictionaryWeight: 50,
        showLogs: true,
      });

      assert.ok(result !== undefined, "result is undefined");
      assert.equal(result.runs, 500);
      assert.equal(result.maxTestRejects, 100);
      assert.equal(result.dictionaryWeight, 50);
      assert.equal(result.showLogs, true);
      assert.equal(result.seed, DEFAULT_FUZZ_SEED);
    });
  });

  describe("resolveSolidityTestUserConfig", () => {
    it("should resolve a flat user config to the default profile", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            isolate: true,
            fuzz: { runs: 50 },
          },
        },
      });

      const defaultProfile = hre.config.test.solidity.profiles.default;
      assert.equal(defaultProfile.isolate, true);
      assert.equal(defaultProfile.fuzz.runs, 50);
      assert.equal(defaultProfile.fuzz.seed, DEFAULT_FUZZ_SEED);
      assert.equal(defaultProfile.forking, undefined);
    });

    it("should resolve a `profiles` wrapper to the same shape as the equivalent flat config", async () => {
      const flatHre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            isolate: true,
            fuzz: { runs: 50 },
          },
        },
      });

      const wrapperHre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            profiles: {
              default: {
                isolate: true,
                fuzz: { runs: 50 },
              },
            },
          },
        },
      });

      assert.deepEqual(
        wrapperHre.config.test.solidity,
        flatHre.config.test.solidity,
      );
    });

    it("should resolve named profiles", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            profiles: {
              default: {
                fuzz: { runs: 50 },
              },
              ci: {
                isolate: true,
                fuzz: { runs: 1_000, seed: "0x123" },
              },
            },
          },
        },
      });

      assert.deepEqual(Object.keys(hre.config.test.solidity.profiles), [
        "default",
        "ci",
      ]);
      assert.equal(hre.config.test.solidity.profiles.default.fuzz.runs, 50);
      assert.equal(
        hre.config.test.solidity.profiles.default.fuzz.seed,
        DEFAULT_FUZZ_SEED,
      );
      assert.equal(hre.config.test.solidity.profiles.ci.isolate, true);
      assert.equal(hre.config.test.solidity.profiles.ci.fuzz.runs, 1_000);
      assert.equal(hre.config.test.solidity.profiles.ci.fuzz.seed, "0x123");
    });
  });
});
