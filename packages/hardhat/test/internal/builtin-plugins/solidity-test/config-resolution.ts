import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  DEFAULT_FUZZ_SEED,
  resolveFuzzConfig,
  resolveInvariantConfig,
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
        timeout: 30n,
      });

      assert.ok(result !== undefined, "result is undefined");
      assert.equal(result.runs, 500);
      assert.equal(result.maxTestRejects, 100);
      assert.equal(result.dictionaryWeight, 50);
      assert.equal(result.showLogs, true);
      assert.equal(result.timeout, 30);
      assert.equal(result.seed, DEFAULT_FUZZ_SEED);
    });
  });

  describe("resolveInvariantConfig", () => {
    it("should return undefined when solidity test invariant config is undefined", () => {
      const result = resolveInvariantConfig(undefined);

      assert.equal(result, undefined);
    });

    it("should convert bigint timeout values to numbers", () => {
      const result = resolveInvariantConfig({ timeout: 60n });

      assert.deepEqual(result, { timeout: 60 });
    });

    it("should preserve other invariant config properties", () => {
      const result = resolveInvariantConfig({
        runs: 500,
        depth: 10,
        failOnRevert: true,
        shrinkRunLimit: 0,
        timeout: 60n,
      });

      assert.deepEqual(result, {
        runs: 500,
        depth: 10,
        failOnRevert: true,
        shrinkRunLimit: 0,
        timeout: 60,
      });
    });
  });

  describe("resolveSolidityTestUserConfig", () => {
    it("should resolve a flat user config to the default profile", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            isolate: true,
            memoryLimit: 17_179_869_184n,
            fuzz: { runs: 50 },
            invariant: { timeout: 100n },
          },
        },
      });

      const defaultProfile = hre.config.test.solidity.profiles.default;
      assert.equal(defaultProfile.isolate, true);
      assert.equal(defaultProfile.memoryLimit, 17_179_869_184n);
      assert.equal(defaultProfile.fuzz.runs, 50);
      assert.equal(defaultProfile.fuzz.seed, DEFAULT_FUZZ_SEED);
      assert.equal(defaultProfile.invariant?.timeout, 100);
      assert.equal(defaultProfile.forking, undefined);
    });

    it("should normalize a number memoryLimit to a bigint", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            memoryLimit: 33_554_432,
          },
        },
      });

      const defaultProfile = hre.config.test.solidity.profiles.default;
      assert.equal(defaultProfile.memoryLimit, 33_554_432n);
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

    it("should resolve every declared profile independently", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        test: {
          solidity: {
            profiles: {
              default: { isolate: true, fuzz: { runs: 5, seed: "0x1" } },
              ci: {
                fuzz: { runs: 500 },
                forking: { url: "https://example.com/ci", blockNumber: 123 },
              },
            },
          },
        },
      });

      const { default: defaultProfile, ci } = hre.config.test.solidity.profiles;

      assert.equal(defaultProfile.isolate, true);
      assert.equal(defaultProfile.fuzz.runs, 5);
      assert.equal(defaultProfile.fuzz.seed, "0x1");
      assert.equal(defaultProfile.forking, undefined);

      // Everything `ci` doesn't set comes from the built-in defaults rather
      // than from `default`: profiles don't inherit from each other.
      assert.equal(ci.isolate, undefined);
      assert.equal(ci.fuzz.runs, 500);
      assert.equal(ci.fuzz.seed, DEFAULT_FUZZ_SEED);
      assert.equal(ci.forking?.blockNumber, 123n);
      assert.equal(await ci.forking?.url?.get(), "https://example.com/ci");
    });
  });
});
