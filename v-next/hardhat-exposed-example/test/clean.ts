import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { createFixtureProjectHRE } from "./helpers/fixture-project.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("Clean hook", () => {
  it("should delete exposedContracts directory when it exists", async () => {
    const hre = await createFixtureProjectHRE("simple-project");
    const exposedPath = hre.config.paths.exposedContracts;

    // Setup: ensure directory exists with content
    await fs.mkdir(exposedPath, { recursive: true });
    await fs.writeFile(path.join(exposedPath, "test.sol"), "// test");

    // Run clean task
    await hre.tasks.getTask("clean").run({});

    // Verify deleted
    assert.equal(await pathExists(exposedPath), false);
  });

  it("should delete exposedContracts directory with nested content", async () => {
    const hre = await createFixtureProjectHRE("simple-project");
    const exposedPath = hre.config.paths.exposedContracts;

    // Setup: create directory with nested content
    const nestedDir = path.join(exposedPath, "contracts", "nested");
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(nestedDir, "deep.sol"), "// deep content");
    await fs.writeFile(path.join(exposedPath, "root.sol"), "// root content");

    // Run clean task
    await hre.tasks.getTask("clean").run({});

    // Verify deleted
    assert.equal(await pathExists(exposedPath), false);
  });

  it("should not throw when exposedContracts directory does not exist", async () => {
    const hre = await createFixtureProjectHRE("simple-project");
    const exposedPath = hre.config.paths.exposedContracts;

    // Ensure directory does not exist
    await fs.rm(exposedPath, { recursive: true, force: true });

    // Should not throw
    await hre.tasks.getTask("clean").run({});
  });

  it("should not throw when exposedContracts is an empty directory", async () => {
    const hre = await createFixtureProjectHRE("simple-project");
    const exposedPath = hre.config.paths.exposedContracts;

    // Setup: create empty directory
    await fs.rm(exposedPath, { recursive: true, force: true });
    await fs.mkdir(exposedPath, { recursive: true });

    // Should not throw
    await hre.tasks.getTask("clean").run({});

    // Verify deleted
    assert.equal(await pathExists(exposedPath), false);
  });
});
