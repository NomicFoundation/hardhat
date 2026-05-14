import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMissingCommands } from "./regression.ts";
import type { ScenarioDefinition } from "../end-to-end/types.ts";

function definition(
  overrides: Partial<ScenarioDefinition> = {},
): ScenarioDefinition {
  return {
    description: "test",
    repo: "org/repo",
    commit: "abc123",
    packageManager: "npm",
    defaultCommand: "npx hardhat compile",
    tags: ["test"],
    ...overrides,
  };
}

describe("findMissingCommands", () => {
  it("returns empty when every scenario has at least one command", () => {
    const result = findMissingCommands([
      {
        id: "ok",
        definition: definition({
          benchmark: {
            commands: { build: { runs: 1, command: "npx hardhat compile" } },
          },
        }),
      },
    ]);

    assert.deepEqual(result, []);
  });

  it("flags scenarios with an empty commands map", () => {
    const result = findMissingCommands([
      {
        id: "empty",
        definition: definition({ benchmark: { commands: {} } }),
      },
    ]);

    assert.deepEqual(result, ["empty"]);
  });

  it("ignores scenarios without a benchmark field (caught upstream by the schema)", () => {
    const result = findMissingCommands([
      { id: "no-bench", definition: definition() },
    ]);

    assert.deepEqual(result, []);
  });

  it("returns ids in input order", () => {
    const result = findMissingCommands([
      {
        id: "ok",
        definition: definition({
          benchmark: { commands: { x: { runs: 1, command: "x" } } },
        }),
      },
      {
        id: "empty-1",
        definition: definition({ benchmark: { commands: {} } }),
      },
      {
        id: "empty-2",
        definition: definition({ benchmark: { commands: {} } }),
      },
    ]);

    assert.deepEqual(result, ["empty-1", "empty-2"]);
  });
});
