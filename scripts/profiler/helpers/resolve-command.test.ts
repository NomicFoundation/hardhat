import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveCommand } from "./resolve-command.ts";
import type { ScenarioDefinition } from "../../end-to-end/types.ts";

const definition: ScenarioDefinition = {
  description: "test",
  repo: "org/repo",
  commit: "abc",
  packageManager: "npm",
  defaultCommand: "npx hardhat test",
  tags: [],
  benchmark: {
    commands: {
      "compile sequence": {
        runs: 2,
        steps: {
          "reset files & cache": {
            command: "git checkout -- a.sol && npx hardhat clean",
            measure: false,
          },
          "cold compile": { command: "npx hardhat compile" },
        },
      },
      "warm compile": { runs: 2, command: "npx hardhat compile" },
      "test solidity": {
        runs: 2,
        command: "npx hardhat test solidity --no-compile",
        dependsOn: ["cold compile"],
      },
    },
  },
};

describe("resolveCommand", () => {
  it("resolves a top-level benchmark command name", () => {
    const resolved = resolveCommand(definition, "test solidity");
    assert.equal(resolved.command, "npx hardhat test solidity --no-compile");
    assert.equal(resolved.resolvedFrom, "test solidity");
  });

  it("resolves a step name inside a step sequence", () => {
    const resolved = resolveCommand(definition, "cold compile");
    assert.equal(resolved.command, "npx hardhat compile");
    assert.equal(resolved.resolvedFrom, "cold compile");
  });

  it("treats non-matching input as a literal shell command", () => {
    const resolved = resolveCommand(definition, "npx hardhat compile --force");
    assert.equal(resolved.command, "npx hardhat compile --force");
    assert.equal(resolved.resolvedFrom, undefined);
  });

  it("treats everything as literal when the scenario has no benchmark", () => {
    const bare = { ...definition, benchmark: undefined };
    const resolved = resolveCommand(bare, "warm compile");
    assert.equal(resolved.command, "warm compile");
    assert.equal(resolved.resolvedFrom, undefined);
  });
});
