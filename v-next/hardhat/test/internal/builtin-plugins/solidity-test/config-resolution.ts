import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
      });

      assert.ok(result !== undefined, "result is undefined");
      assert.equal(result.runs, 500);
      assert.equal(result.maxTestRejects, 100);
      assert.equal(result.dictionaryWeight, 50);
      assert.equal(result.seed, DEFAULT_FUZZ_SEED);
    });
  });
});
