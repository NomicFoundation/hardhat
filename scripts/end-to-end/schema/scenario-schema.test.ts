import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBenchmarkConfig,
  isCommandConfig,
  isScenarioDefinition,
  isStepConfig,
} from "./scenario-schema.ts";

const baseScenario = {
  description: "test",
  repo: "org/repo",
  commit: "abc123",
  packageManager: "npm" as const,
  defaultCommand: "npx hardhat compile",
  tags: ["test"],
};

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

  it("accepts pnpm as a package manager", () => {
    const value = {
      description: "Uniswap V4 core with pnpm",
      repo: "ChristopherDedominici/core",
      commit: "abc123",
      packageManager: "pnpm",
      defaultCommand: "pnpm run test",
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
        packageManager: "volt",
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

  it("accepts benchmark: { skip: true }", () => {
    assert.equal(
      isScenarioDefinition({
        ...baseScenario,
        benchmark: { skip: true },
      }),
      true,
    );
  });

  it("accepts benchmark.commands with one entry", () => {
    assert.equal(
      isScenarioDefinition({
        ...baseScenario,
        benchmark: {
          commands: {
            "warm compile": { runs: 10, command: "npx hardhat compile" },
          },
        },
      }),
      true,
    );
  });

  it("accepts benchmark.commands with multiple ordered entries", () => {
    assert.equal(
      isScenarioDefinition({
        ...baseScenario,
        benchmark: {
          commands: {
            "cold compile": {
              runs: 3,
              prepare: "npx hardhat clean",
              command: "npx hardhat compile",
            },
            "warm compile": { runs: 50, command: "npx hardhat compile" },
            test: { runs: 7, command: "npx hardhat test" },
          },
        },
      }),
      true,
    );
  });

  it("rejects benchmark.commands that is not an object", () => {
    assert.equal(
      isScenarioDefinition({
        ...baseScenario,
        benchmark: { commands: [] },
      }),
      false,
    );
  });

  it("rejects an integer-like command key (would break order)", () => {
    assert.equal(
      isScenarioDefinition({
        ...baseScenario,
        benchmark: {
          commands: { "1": { runs: 1, command: "npx hardhat compile" } },
        },
      }),
      false,
    );
  });

  it("rejects benchmark.skip values other than true", () => {
    assert.equal(
      isScenarioDefinition({ ...baseScenario, benchmark: { skip: false } }),
      false,
    );
  });
});

describe("isCommandConfig", () => {
  it("accepts the minimal shape (runs + command)", () => {
    assert.equal(
      isCommandConfig({ runs: 1, command: "npx hardhat compile" }),
      true,
    );
  });

  it("accepts an optional prepare string", () => {
    assert.equal(
      isCommandConfig({
        runs: 5,
        prepare: "npx hardhat clean",
        command: "npx hardhat compile",
      }),
      true,
    );
  });

  it("rejects when runs is missing", () => {
    assert.equal(isCommandConfig({ command: "npx hardhat compile" }), false);
  });

  it("rejects when command is missing", () => {
    assert.equal(isCommandConfig({ runs: 3 }), false);
  });

  it("rejects runs that are zero", () => {
    assert.equal(
      isCommandConfig({ runs: 0, command: "npx hardhat compile" }),
      false,
    );
  });

  it("rejects runs that are negative", () => {
    assert.equal(
      isCommandConfig({ runs: -1, command: "npx hardhat compile" }),
      false,
    );
  });

  it("rejects runs that are non-integer", () => {
    assert.equal(
      isCommandConfig({ runs: 1.5, command: "npx hardhat compile" }),
      false,
    );
  });

  it("rejects prepare that is not a string", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        prepare: 42,
        command: "npx hardhat compile",
      }),
      false,
    );
  });

  it("rejects extra unknown properties", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        command: "npx hardhat compile",
        warmup: 1,
      }),
      false,
    );
  });

  it("rejects arrays", () => {
    assert.equal(isCommandConfig([3, "npx hardhat compile"]), false);
  });

  it("rejects null", () => {
    assert.equal(isCommandConfig(null), false);
  });

  it("rejects an empty command string", () => {
    assert.equal(isCommandConfig({ runs: 1, command: "" }), false);
  });

  it("rejects an empty prepare string", () => {
    assert.equal(
      isCommandConfig({
        runs: 1,
        prepare: "",
        command: "npx hardhat compile",
      }),
      false,
    );
  });

  it("accepts a steps variant", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        steps: {
          reset: {
            command: "git checkout -- f && npx hardhat clean",
            measure: false,
          },
          "cold compile": { command: "npx hardhat compile" },
        },
      }),
      true,
    );
  });

  it("rejects when both command and steps are present", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        command: "npx hardhat compile",
        steps: { "cold compile": { command: "npx hardhat compile" } },
      }),
      false,
    );
  });

  it("rejects when neither command nor steps is present", () => {
    assert.equal(isCommandConfig({ runs: 3 }), false);
  });

  it("rejects an empty steps map", () => {
    assert.equal(isCommandConfig({ runs: 3, steps: {} }), false);
  });

  it("rejects an empty step key", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        steps: { "": { command: "npx hardhat compile" } },
      }),
      false,
    );
  });

  it("rejects an integer-like step key (would break order)", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        steps: { "1": { command: "npx hardhat compile" } },
      }),
      false,
    );
  });

  it("rejects unknown keys alongside steps", () => {
    assert.equal(
      isCommandConfig({
        runs: 3,
        prepare: "x",
        steps: { "cold compile": { command: "npx hardhat compile" } },
      }),
      false,
    );
  });
});

describe("isStepConfig", () => {
  it("accepts a step with just a command (measure defaults true)", () => {
    assert.equal(isStepConfig({ command: "npx hardhat compile" }), true);
  });

  it("accepts a step with measure false", () => {
    assert.equal(
      isStepConfig({ command: "npx hardhat clean", measure: false }),
      true,
    );
  });

  it("rejects a step missing command", () => {
    assert.equal(isStepConfig({ measure: true }), false);
  });

  it("rejects an empty command", () => {
    assert.equal(isStepConfig({ command: "" }), false);
  });

  it("rejects a non-boolean measure", () => {
    assert.equal(
      isStepConfig({ command: "npx hardhat compile", measure: "false" }),
      false,
    );
  });

  it("rejects unknown step keys", () => {
    assert.equal(
      isStepConfig({ command: "npx hardhat compile", runs: 3 }),
      false,
    );
  });
});

describe("isBenchmarkConfig", () => {
  it("rejects an empty object (must declare skip or commands)", () => {
    assert.equal(isBenchmarkConfig({}), false);
  });

  it("accepts skip on its own", () => {
    assert.equal(isBenchmarkConfig({ skip: true }), true);
  });

  it("accepts commands on its own", () => {
    assert.equal(
      isBenchmarkConfig({ commands: { x: { runs: 1, command: "x" } } }),
      true,
    );
  });

  it("accepts skip with commands together", () => {
    assert.equal(
      isBenchmarkConfig({
        skip: true,
        commands: { test: { runs: 1, command: "x" } },
      }),
      true,
    );
  });

  it("rejects an empty commands map", () => {
    assert.equal(isBenchmarkConfig({ commands: {} }), false);
  });

  it("rejects unknown top-level benchmark keys (e.g. stale runs)", () => {
    assert.equal(
      isBenchmarkConfig({
        commands: { x: { runs: 1, command: "x" } },
        runs: { coldCompile: 3 },
      }),
      false,
    );
  });

  it("rejects an empty command-map key", () => {
    assert.equal(
      isBenchmarkConfig({
        commands: { "": { runs: 1, command: "npx hardhat compile" } },
      }),
      false,
    );
  });

  it("rejects commands containing an invalid entry", () => {
    assert.equal(
      isBenchmarkConfig({
        commands: {
          good: { runs: 1, command: "x" },
          bad: { runs: 0, command: "y" },
        },
      }),
      false,
    );
  });

  it("rejects when value is an array", () => {
    assert.equal(isBenchmarkConfig([]), false);
  });
});
