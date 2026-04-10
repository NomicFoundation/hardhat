import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";
import type { SolidityBuildInfo } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { getHardhatVersion } from "../../../../../../src/internal/utils/package.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

const projectTemplate = {
  name: "test",
  version: "1.0.0",
  files: {
    "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
  },
};

async function readBuildInfo(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
): Promise<SolidityBuildInfo> {
  const buildInfoId = await hre.artifacts.getBuildInfoId(contractName);
  assert.ok(buildInfoId !== undefined, "Expected a build info id for Foo");

  const buildInfoPath = await hre.artifacts.getBuildInfoPath(buildInfoId);
  assert.ok(buildInfoPath !== undefined, "Expected build info path to exist");

  return readJsonFile<SolidityBuildInfo>(buildInfoPath);
}

describe(
  "build info versions",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  function () {
    it("should include versions in build info when includeBuildInfoVersions is true", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const hre = await project.getHRE(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                includeBuildInfoVersions: true,
              },
            },
          },
        },
        { buildProfile: "default" },
      );

      await hre.tasks.getTask("build").run({ quiet: true });

      const buildInfo = await readBuildInfo(hre, "Foo");

      const hardhatVersion = await getHardhatVersion();
      assert.deepEqual(buildInfo.versions, { hardhat: hardhatVersion });
    });

    it("should not include versions in build info when includeBuildInfoVersions is false", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const hre = await project.getHRE(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                includeBuildInfoVersions: false,
              },
            },
          },
        },
        { buildProfile: "default" },
      );

      await hre.tasks.getTask("build").run({ quiet: true });

      const buildInfo = await readBuildInfo(hre, "Foo");

      assert.equal(
        buildInfo.versions,
        undefined,
        "Expected versions to not be present",
      );
    });

    it("should include versions in build info for the production profile by default", async () => {
      await using project = await useTestProjectTemplate(projectTemplate);
      const hre = await project.getHRE(
        { solidity: "0.8.28" },
        { buildProfile: "production" },
      );

      await hre.tasks.getTask("build").run({ quiet: true });

      const buildInfo = await readBuildInfo(hre, "Foo");

      const hardhatVersion = await getHardhatVersion();
      assert.deepEqual(buildInfo.versions, { hardhat: hardhatVersion });
    });

    it("should produce different build ids with and without versions", async () => {
      await using projectA = await useTestProjectTemplate(projectTemplate);
      const hreA = await projectA.getHRE(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                includeBuildInfoVersions: true,
              },
            },
          },
        },
        { buildProfile: "default" },
      );

      await hreA.tasks.getTask("build").run({ quiet: true });
      const buildInfoA = await readBuildInfo(hreA, "Foo");

      await using projectB = await useTestProjectTemplate(projectTemplate);
      const hreB = await projectB.getHRE(
        {
          solidity: {
            profiles: {
              default: {
                version: "0.8.28",
                includeBuildInfoVersions: false,
              },
            },
          },
        },
        { buildProfile: "default" },
      );

      await hreB.tasks.getTask("build").run({ quiet: true });
      const buildInfoB = await readBuildInfo(hreB, "Foo");

      assert.notEqual(
        buildInfoA.id,
        buildInfoB.id,
        "Build IDs should differ when includeBuildInfoVersions changes",
      );
    });
  },
);
