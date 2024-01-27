import type { HardhatRuntimeEnvironment } from "hardhat/types";

import path from "path";
import fs from "fs/promises";
import { assert } from "chai";
import { diffLinesUnified } from "jest-diff";
import { resetHardhatContext } from "hardhat/plugins-testing";

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/internal/type-extensions";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

export const useEnvironment = (fixtureProjectName: string): void => {
  before("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = "hardhat";

    this.hre = require("hardhat");
  });

  after("Resetting hardhat context", async function () {
    process.chdir(path.resolve(`${__dirname}/..`));
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
};

export const assertSnapshotMatch = async (
  snapshotPath: string,
  generatedFilePath: string
) => {
  const expectedSnapshotContent = await fs.readFile(snapshotPath, "utf-8");
  const generatedFileContent = await fs.readFile(generatedFilePath, "utf-8");

  if (expectedSnapshotContent !== generatedFileContent) {
    assert.fail(`
Generated file differs from the expected snapshot:

${generatedFilePath} should match ${snapshotPath}

To update the snapshot, run:
pnpm snapshots:update

${diffLinesUnified(
  expectedSnapshotContent.split("\n"),
  generatedFileContent.split("\n"),
  {
    contextLines: 3,
    expand: false,
    includeChangeCounts: true,
  }
)}`);
  }
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
