import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import { getSlangBinaryPath } from "../src/internal/downloader.js";
import { SlangCompiler } from "../src/internal/slang-compiler.js";

describe(
  "hardhat-slang Solidity version",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    useFixtureProject("with-debug-info");

    it("compiles at the compiler entry's version, which the binary reads from settings.solidityVersion", async () => {
      const configPath = await resolveHardhatConfigPath();
      const userConfig = await importUserConfig(configPath);
      const hre = await createHardhatRuntimeEnvironment(userConfig);

      const rootFilePaths = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const counterPath = rootFilePaths.find(
        (p) => path.basename(p) === "Counter.sol",
      );
      assert.ok(
        counterPath !== undefined,
        "Counter.sol should be a build root",
      );

      const jobsResult = await hre.solidity.getCompilationJobs([counterPath], {
        force: true,
        quiet: true,
        buildProfile: "slang",
      });
      assert.ok(jobsResult.success, "getCompilationJobs should succeed");
      const job = jobsResult.compilationJobsPerFile.get(counterPath);
      assert.ok(job !== undefined, "Counter.sol should have a job");

      const input = await job.getSolcInput();
      const settings: Record<string, unknown> = input.settings;
      assert.equal(settings.solidityVersion, "0.8.34");

      const { output } = await hre.solidity.runCompilationJob(job, {
        quiet: true,
        buildProfile: "slang",
      });
      const errors = (output.errors ?? []).filter(
        (e) => e.severity === "error",
      );
      assert.deepEqual(
        errors.map((e) => e.message),
        [],
        "Counter.sol (pragma ^0.8.34) should compile at 0.8.34",
      );

      // The same input at a version below the pragma must be refused, which
      // only happens if the binary compiles at settings.solidityVersion.
      const slangVersion = hre.config.slang.version;
      assert.ok(slangVersion !== undefined, "the fixture pins slang.version");
      const release = SLANG_RELEASES[slangVersion];
      const compiler = new SlangCompiler(
        slangVersion,
        await getSlangBinaryPath(slangVersion, release),
        { release },
      );
      const mismatchedSettings = {
        ...input.settings,
        solidityVersion: "0.8.20",
      };
      const mismatched = await compiler.compile({
        ...input,
        settings: mismatchedSettings,
      });
      const mismatchErrors = (mismatched.errors ?? []).filter(
        (e) => e.severity === "error",
      );
      assert.ok(
        mismatchErrors.some((e) => e.message.includes("'0.8.20'")),
        `expected slang to reject pragma ^0.8.34 at 0.8.20, got: ${JSON.stringify(mismatchErrors.map((e) => e.message))}`,
      );
    });
  },
);
