import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isScenarioDefinition } from "./scenario-schema.ts";

describe("isScenarioDefinition", () => {
  it("accepts a minimal valid scenario", () => {
    const value = {
      description: "Compile OpenZeppelin contracts",
      repo: "OpenZeppelin/openzeppelin-contracts",
      commit: "abc123",
      packageManager: "npm",
      defaultCommand: "npx hardhat compile",
      tags: ["solidity-compile"],
    };

    assert.equal(isScenarioDefinition(value), true);
  });

  it("accepts a scenario with all optional fields", () => {
    const value = {
      description: "Compile OpenZeppelin contracts with all options",
      repo: "OpenZeppelin/openzeppelin-contracts",
      commit: "abc123",
      packageManager: "npm",
      defaultCommand: "npx hardhat compile",
      preinstall: "./preinstall.sh",
      install: "./install.sh",
      tags: ["solidity-compile"],
      env: { FOO: "bar" },
      submodules: true,
      disabled: true,
    };

    assert.equal(isScenarioDefinition(value), true);
  });

  it("accepts bun as a package manager", () => {
    const value = {
      description: "ENS contracts with bun",
      repo: "ensdomains/ens-contracts",
      commit: "abc123",
      packageManager: "bun",
      defaultCommand: "npx hardhat compile",
      tags: ["external-repo"],
    };

    assert.equal(isScenarioDefinition(value), true);
  });

  it("accepts yarn as a package manager", () => {
    const value = {
      description: "Lido finance with yarn",
      repo: "ChristopherDedominici/core",
      commit: "abc123",
      packageManager: "yarn",
      defaultCommand: "yarn run test",
      tags: ["external-repo"],
    };

    assert.equal(isScenarioDefinition(value), true);
  });

  it("accepts a scenario with disabled: true", () => {
    const value = {
      description: "A disabled scenario",
      repo: "org/repo",
      commit: "abc123",
      packageManager: "npm",
      defaultCommand: "npx hardhat compile",
      tags: ["test"],
      disabled: true,
    };

    assert.equal(isScenarioDefinition(value), true);
  });

  it("rejects disabled: false", () => {
    assert.equal(
      isScenarioDefinition({
        description: "test",
        repo: "org/repo",
        commit: "abc",
        packageManager: "npm",
        tags: [],
        disabled: false,
        defaultCommand: "npx hardhat test",
      }),
      false,
    );
  });

  it("rejects when defaultCommand is missing", () => {
    assert.equal(
      isScenarioDefinition({
        description: "test",
        repo: "org/repo",
        commit: "abc",
        packageManager: "npm",
        tags: [],
      }),
      false,
    );
  });

  it("rejects when description is missing", () => {
    assert.equal(
      isScenarioDefinition({
        repo: "org/repo",
        commit: "abc",
        packageManager: "npm",
        tags: [],
      }),
      false,
    );
  });

  it("rejects when repo is missing", () => {
    assert.equal(
      isScenarioDefinition({
        description: "test",
        commit: "abc",
        packageManager: "npm",
        tags: [],
      }),
      false,
    );
  });

  it("rejects an unsupported packageManager", () => {
    assert.equal(
      isScenarioDefinition({
        repo: "org/repo",
        commit: "abc",
        packageManager: "pnpm",
        tags: [],
        description: "a scenario",
        defaultCommand: "npx hardhat test",
      }),
      false,
    );
  });

  it("rejects when tags contains non-string", () => {
    assert.equal(
      isScenarioDefinition({
        repo: "org/repo",
        commit: "abc",
        packageManager: "npm",
        tags: [42],
      }),
      false,
    );
  });

  it("rejects when env has non-string values", () => {
    assert.equal(
      isScenarioDefinition({
        repo: "org/repo",
        commit: "abc",
        packageManager: "npm",
        tags: [],
        env: { FOO: 123 },
      }),
      false,
    );
  });

  it("rejects null", () => {
    assert.equal(isScenarioDefinition(null), false);
  });

  it("rejects non-object", () => {
    assert.equal(isScenarioDefinition("not an object"), false);
  });
});
