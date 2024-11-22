import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("hardhat-chai-matchers plugin correctly initialized", () => {
  useFixtureProject("hook-initialization");

  it("should load the plugin via hook and use the functionalities in a mocha test", async () => {
    const configPath =
      "./fixture-projects/hook-initialization/hardhat.config.ts";
    const hardhatConfig = await import(configPath);

    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    const result = await hre.tasks.getTask(["test", "mocha"]).run({
      testFiles: ["./test/test.ts"],
      noCompile: true,
    });

    assert.equal(result, 0);
  });
});
