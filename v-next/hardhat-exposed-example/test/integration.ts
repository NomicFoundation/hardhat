import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { createFixtureProjectHRE } from "./helpers/fixture-project.js";

describe("hardhat-exposed-example", () => {
  describe("Clean build", () => {
    it("should generate exposed files and artifacts from scratch", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // Remove the exposed contracts directory to simulate a fresh build
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      const buildTask = hre.tasks.getTask("build");
      await buildTask.run({ force: true, noTests: true, quiet: true });

      // Verify exposed files were generated
      await assertFilesExistsAsExposed(
        hre.config.paths.sources.solidity[0],
        hre.config.paths.exposedContracts,
      );

      // Verify artifacts were created for exposed contracts
      const aExposedArtifact = await hre.artifacts.readArtifact("AExposed");
      assert.equal(aExposedArtifact.contractName, "AExposed");

      const aaExposedArtifact = await hre.artifacts.readArtifact("AAExposed");
      assert.equal(aaExposedArtifact.contractName, "AAExposed");
    });
  });

  describe("Incremental build (cache hit)", () => {
    it("should not regenerate exposed contracts when source is unchanged", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // First build - generates exposed contracts
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      const buildTask = hre.tasks.getTask("build");
      await buildTask.run({ noTests: true, quiet: true });

      // Get the modification time of the exposed contract
      const exposedFilePath = path.join(
        hre.config.paths.exposedContracts,
        "contracts",
        "A.sol",
      );
      const firstStat = await fs.stat(exposedFilePath);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second build - should be a cache hit, exposed contract unchanged
      await buildTask.run({ noTests: true, quiet: true });

      const secondStat = await fs.stat(exposedFilePath);

      // The exposed contract file should not have been modified
      assert.equal(
        firstStat.mtimeMs,
        secondStat.mtimeMs,
        "Exposed contract should not be regenerated on cache hit",
      );
    });
  });

  describe("Contract modification", () => {
    it("should update exposed contracts when source is modified", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // First build
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      const buildTask = hre.tasks.getTask("build");
      await buildTask.run({ noTests: true, quiet: true });

      // Get the content of the exposed contract
      const exposedFilePath = path.join(
        hre.config.paths.exposedContracts,
        "contracts",
        "A.sol",
      );
      const firstContent = await fs.readFile(exposedFilePath, "utf-8");

      // Verify initial content
      assert.ok(
        firstContent.includes("AExposed"),
        "Initial exposed file should contain AExposed",
      );
      assert.ok(
        firstContent.includes("AAExposed"),
        "Initial exposed file should contain AAExposed",
      );

      // Modify the source contract - add a new contract
      const sourceFilePath = path.join(
        hre.config.paths.sources.solidity[0],
        "A.sol",
      );
      const originalSource = await fs.readFile(sourceFilePath, "utf-8");
      const modifiedSource = originalSource + "\ncontract AAA {}";
      await fs.writeFile(sourceFilePath, modifiedSource);

      try {
        // Rebuild - should regenerate exposed contract
        await buildTask.run({ noTests: true, quiet: true });

        const updatedContent = await fs.readFile(exposedFilePath, "utf-8");

        // Verify updated content includes the new contract
        assert.ok(
          updatedContent.includes("AExposed"),
          "Updated file should still contain AExposed",
        );
        assert.ok(
          updatedContent.includes("AAExposed"),
          "Updated file should still contain AAExposed",
        );
        assert.ok(
          updatedContent.includes("AAAExposed"),
          "New contract should be exposed",
        );
      } finally {
        // Restore original source
        await fs.writeFile(sourceFilePath, originalSource);
      }
    });
  });

  describe("Force rebuild", () => {
    it("should regenerate exposed contracts on force build", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // First build
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      const buildTask = hre.tasks.getTask("build");
      await buildTask.run({ noTests: true, quiet: true });

      // Get the modification time
      const exposedFilePath = path.join(
        hre.config.paths.exposedContracts,
        "contracts",
        "A.sol",
      );
      const firstStat = await fs.stat(exposedFilePath);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Force rebuild - should regenerate exposed contracts
      await buildTask.run({ force: true, noTests: true, quiet: true });

      const secondStat = await fs.stat(exposedFilePath);

      // The exposed contract file should have been modified
      assert.ok(
        secondStat.mtimeMs > firstStat.mtimeMs,
        "Exposed contract should be regenerated on force build",
      );
    });
  });

  describe("Artifacts persistence", () => {
    it("should preserve exposed artifacts after cleanup", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // Clean build from scratch
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      const buildTask = hre.tasks.getTask("build");
      await buildTask.run({ noTests: true, quiet: true });

      // Verify artifacts exist
      const artifactPath = await hre.artifacts.getArtifactPath("AExposed");
      assert.ok(
        await fileExists(artifactPath),
        "AExposed artifact should exist",
      );

      // Build again - cleanup should preserve exposed artifacts
      await buildTask.run({ noTests: true, quiet: true });

      // Verify artifacts still exist after cleanup
      assert.ok(
        await fileExists(artifactPath),
        "AExposed artifact should still exist after rebuild",
      );

      // Verify we can read the artifact
      const artifact = await hre.artifacts.readArtifact("AExposed");
      assert.equal(artifact.contractName, "AExposed");
    });
  });

  describe("Exposed contract compilation failure", () => {
    it("should return error when exposed contract fails to compile", async () => {
      const hre = await createFixtureProjectHRE("simple-project");

      // Clean start
      await removeDirectory(hre.config.paths.exposedContracts);
      await removeDirectory(hre.config.paths.artifacts);
      await removeDirectory(hre.config.paths.cache);

      // Create an abstract contract. The exposed version will inherit from it
      // without implementing the abstract method, causing a compilation error.
      // Note: We use "contract" (not "abstract contract") so the generator
      // creates an exposed version, but we make it abstract by having an
      // unimplemented function.
      const sourceFilePath = path.join(
        hre.config.paths.sources.solidity[0],
        "WillFailExposed.sol",
      );
      // This contract compiles fine on its own, but the exposed version
      // "contract WillFailExposedExposed is WillFailExposed {}" won't compile
      // because it doesn't implement the abstract method
      const abstractContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WillFailExposed {
    function mustImplement() external virtual returns (uint256);
}
`;
      await fs.mkdir(path.dirname(sourceFilePath), { recursive: true });
      await fs.writeFile(sourceFilePath, abstractContract);

      try {
        const buildTask = hre.tasks.getTask("build");

        // Build should fail because the exposed contract can't compile
        // (it inherits from a contract with an unimplemented virtual function)
        let buildFailed = false;
        try {
          await buildTask.run({ noTests: true, quiet: true });
        } catch (error) {
          buildFailed = true;
          // Verify it's a compilation error
          assert.ok(
            error instanceof Error,
            "Error should be an instance of Error",
          );
        }

        assert.ok(
          buildFailed,
          "Build should have failed due to exposed contract compilation error",
        );
      } finally {
        // Cleanup: remove the test file
        await fs.rm(sourceFilePath, { force: true });
        // Clean up exposed contract
        const exposedPath = path.join(
          hre.config.paths.exposedContracts,
          "contracts",
          "WillFailExposed.sol",
        );
        await fs.rm(exposedPath, { force: true });
      }
    });
  });
});

async function removeDirectory(directory: string) {
  await fs.rm(directory, { recursive: true, force: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertFilesExistsAsExposed(
  contractsDirectory: string,
  exposedContractsDirectory: string,
) {
  // Get all .sol files from contracts directory
  const contractFiles = await getFilesRecursively(contractsDirectory, ".sol");

  for (const contractFile of contractFiles) {
    // Calculate expected exposed path
    // contracts/A.sol -> exposed-contracts/contracts/A.sol
    const relativePath = path.relative(
      path.dirname(contractsDirectory),
      contractFile,
    );
    const expectedExposedPath = path.join(
      exposedContractsDirectory,
      relativePath,
    );

    // Assert file exists
    await fs.access(expectedExposedPath);
  }
}

async function getFilesRecursively(
  dir: string,
  ext: string,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFilesRecursively(fullPath, ext)));
    } else if (entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}
