import assert from "node:assert";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../src/hre.js";
import { builtinPlugins } from "../../src/internal/builtin-plugins/index.js";
import { getHRE } from "../../src/internal/hre-singleton.js";

describe("HRE", () => {
  describe("createHardhatRuntimeEnvironment", () => {
    it("should include the built-in plugins", async () => {
      const hre = await createHardhatRuntimeEnvironment({});

      assert.deepStrictEqual(hre.config.plugins, builtinPlugins);
    });
  });

  describe("getHRE", () => {
    it("should return the same instance", async () => {
      const hre1 = await getHRE({ plugins: [{ id: "custom task" }] });
      const hre2 = await getHRE({});

      assert.deepEqual(
        hre1.config.plugins.find((p) => p.id === "custom task"),
        { id: "custom task" },
      );
      assert.deepEqual(
        hre2.config.plugins.find((p) => p.id === "custom task"),
        { id: "custom task" },
      );
      assert.deepStrictEqual(hre1, hre2);
    });
  });
});
