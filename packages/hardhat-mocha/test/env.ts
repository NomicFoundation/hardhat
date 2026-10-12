import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTestEnvManager,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

describe("Hardhat Mocha env variables", () => {
  useFixtureProject("test-project");

  const { unsetEnvVar } = createTestEnvManager();

  it("should set the NODE_ENV variable if undefined and HH_TEST always", async () => {
    const { createHardhatRuntimeEnvironment } = await import("hardhat/hre");
    const hardhatConfig =
      await import("./fixture-projects/test-project/hardhat.config.js");
    const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

    unsetEnvVar("NODE_ENV");
    // The task sets this one, so track it to have it restored too.
    unsetEnvVar("HH_TEST");

    await hre.tasks.getTask(["test", "mocha"]).run({ noCompile: true });

    assert.equal(process.env.NODE_ENV, "test");
    assert.equal(process.env.HH_TEST, "true");
  });
});
