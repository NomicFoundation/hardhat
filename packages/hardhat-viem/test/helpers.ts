import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { after, before } from "node:test";
import assert from "node:assert";

import path from "path";
import fs from "fs/promises";
// import { assert } from "chai";
import { diffLinesUnified } from "jest-diff";
import { resetHardhatContext } from "hardhat/plugins-testing";

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/internal/type-extensions";

export const useEnvironment = (
  fixtureProjectName: string
): (() => HardhatRuntimeEnvironment) => {
  let hre: HardhatRuntimeEnvironment;

  before(function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = "hardhat";

    hre = require("hardhat");
  });

  after(() => {
    process.chdir(path.resolve(`${__dirname}/..`));
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });

  return () => hre;
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
