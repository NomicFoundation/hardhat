import type { SolidityCompilerUserConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

// Hardhat fills in an EVM version for each Solidity version when the user
// doesn't set one, and below 0.8.25 that is older than any slang supports.
// These assert the compiler *input*, without spawning slang. Creating the
// compilation jobs still downloads the configured compilers, so they are slow.
const skipSlow = process.env.HARDHAT_DISABLE_SLOW_TESTS === "true";

describe("hardhat-slang default EVM version", { skip: skipSlow }, () => {
  useEphemeralFixtureProject("simple");

  for (const version of ["0.8.0", "0.8.20", "0.8.24"]) {
    it(`raises Hardhat's pre-cancun default to cancun for Solidity ${version}`, async () => {
      assert.equal(
        await getSlangEvmVersion({ type: "slang", version }),
        "cancun",
      );
    });
  }

  for (const [version, evmVersion] of [
    ["0.8.25", "cancun"],
    ["0.8.30", "prague"],
    ["0.8.34", "osaka"],
  ]) {
    it(`keeps Hardhat's default of ${evmVersion} for Solidity ${version}`, async () => {
      assert.equal(
        await getSlangEvmVersion({ type: "slang", version }),
        evmVersion,
      );
    });
  }

  it("leaves the EVM version unset where Hardhat has no default", async () => {
    assert.equal(
      await getSlangEvmVersion({ type: "slang", version: "0.8.37" }),
      undefined,
    );
  });

  it("keeps a user-set EVM version over the plugin's default", async () => {
    assert.equal(
      await getSlangEvmVersion({
        type: "slang",
        version: "0.8.20",
        settings: { evmVersion: "prague" },
      }),
      "prague",
    );
  });
});

describe(
  "hardhat-slang compiles below Solidity 0.8.25",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  () => {
    useEphemeralFixtureProject("simple");

    it("builds with no EVM version set", async () => {
      const hre = await createHre(
        { type: "slang", version: "0.8.20" },
        "slang",
      );

      await hre.tasks
        .getTask("build")
        .run({ force: true, quiet: true, noTests: true });

      const { bytecode } = await hre.artifacts.readArtifact("Greeter");
      assert.notEqual(bytecode, "0x");
    });
  },
);

async function createHre(
  slangCompiler: SolidityCompilerUserConfig,
  buildProfile?: string,
) {
  return await createHardhatRuntimeEnvironment(
    {
      solidity: {
        profiles: {
          default: {
            version: "0.8.34",
          },
          slang: slangCompiler,
        },
      },
      slang: { version: "0.1.0-pre.2026-10-14" },
      plugins: [(await import("../src/index.js")).default],
    },
    { buildProfile },
  );
}

async function getSlangEvmVersion(
  slangCompiler: SolidityCompilerUserConfig,
): Promise<string | undefined> {
  const hre = await createHre(slangCompiler);

  const rootFilePaths = await hre.solidity.getRootFilePaths({
    scope: "contracts",
  });

  const jobsResult = await hre.solidity.getCompilationJobs(rootFilePaths, {
    force: true,
    quiet: true,
    buildProfile: "slang",
  });
  assert.ok(
    jobsResult.success,
    "getCompilationJobs should succeed for the slang profile",
  );

  const job = [...jobsResult.compilationJobsPerFile.values()][0];
  const solcInput = await job.getSolcInput();

  return solcInput.settings.evmVersion;
}
