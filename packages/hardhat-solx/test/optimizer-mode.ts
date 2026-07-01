/* eslint-disable @typescript-eslint/consistent-type-assertions -- test reads
the solx-specific `optimizer.mode`, which isn't on hardhat's CompilerInput type */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

// Proves the plugin's default optimizer.mode reaches the resolved solcInput
// (which hardhat persists as build-info) through the real pipeline — asserting
// the compiler *input*, not compiled output, and without spawning solx.
describe("hardhat-solx optimizer mode reaches the solc input", () => {
  useEphemeralFixtureProject("simple");

  it("defaults optimizer.mode to -O1 in the solx profile's solcInput", async () => {
    const configPath = await resolveHardhatConfigPath();
    const userConfig = await importUserConfig(configPath);
    const hre = await createHardhatRuntimeEnvironment(userConfig);

    const rootFilePaths = await hre.solidity.getRootFilePaths({
      scope: "contracts",
    });

    const jobsResult = await hre.solidity.getCompilationJobs(rootFilePaths, {
      force: true,
      quiet: true,
      buildProfile: "solx",
    });
    assert.ok(
      jobsResult.success,
      "getCompilationJobs should succeed for the solx profile",
    );

    const job = [...jobsResult.compilationJobsPerFile.values()][0];
    const solcInput = await job.getSolcInput();

    const optimizer = solcInput.settings.optimizer as
      | { mode?: string }
      | undefined;
    assert.equal(
      optimizer?.mode,
      "1",
      "the plugin's default -O1 should reach the resolved solcInput (and thus build-info)",
    );
    assert.equal(
      (solcInput.settings as { viaIR?: boolean }).viaIR,
      false,
      "the plugin's default viaIR:false should also reach the resolved solcInput",
    );
  });
});
