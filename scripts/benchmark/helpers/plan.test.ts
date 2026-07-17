import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { globToRegExp, parseGlobList, planCommands } from "./plan.ts";
import type { CommandConfig } from "../../end-to-end/types.ts";

// Mirrors the real uniswap-v4-core shape with dependsOn wired the way the
// scenarios are annotated: a compile sequence, then warm compile and test
// solidity that only need a cold compile (not the edit&compile steps).
function fixture(): Record<string, CommandConfig> {
  return {
    "compile sequence": {
      runs: 2,
      steps: {
        "reset files & cache": {
          command: "git checkout . && clean",
          measure: false,
        },
        "cold compile": {
          command: "compile",
          dependsOn: ["reset files & cache"],
        },
        "edit min": {
          command: "edit a && compile",
          dependsOn: ["cold compile"],
        },
        "edit max": {
          command: "edit b && compile",
          dependsOn: ["cold compile"],
        },
      },
    },
    "warm compile": {
      runs: 3,
      command: "compile",
      dependsOn: ["cold compile"],
    },
    "test solidity": {
      runs: 3,
      command: "test --no-compile",
      dependsOn: ["cold compile"],
    },
  };
}

// Compact view: what each planned command runs and reports.
function summarize(plan: ReturnType<typeof planCommands>) {
  return plan.map((p) => ({
    name: p.name,
    runStepNames: p.runStepNames,
    emit: p.emit,
    emitSteps: p.emitSteps,
  }));
}

describe("globToRegExp", () => {
  it("matches literally and supports * and ?", () => {
    assert.ok(globToRegExp("cold compile").test("cold compile"));
    assert.ok(!globToRegExp("cold compile").test("warm compile"));
    assert.ok(globToRegExp("*compile*").test("edit & compile min deps"));
    assert.ok(globToRegExp("test *").test("test solidity"));
    assert.ok(globToRegExp("co?d compile").test("cold compile"));
  });

  it("is anchored (no partial matches)", () => {
    assert.ok(!globToRegExp("compile").test("warm compile"));
  });
});

describe("parseGlobList", () => {
  it("returns undefined when absent; splits + trims otherwise", () => {
    assert.equal(parseGlobList(undefined), undefined);
    assert.deepEqual(parseGlobList("a-*, b-* ,c"), ["a-*", "b-*", "c"]);
    assert.equal(parseGlobList(" , "), undefined);
  });
});

describe("planCommands", () => {
  it("no filter → runs and reports everything, in order", () => {
    const plan = summarize(planCommands(fixture(), undefined));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        runStepNames: [
          "reset files & cache",
          "cold compile",
          "edit min",
          "edit max",
        ],
        emit: false,
        emitSteps: ["cold compile", "edit min", "edit max"],
      },
      {
        name: "warm compile",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
      {
        name: "test solidity",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
    ]);
  });

  it("'test solidity' (a single command) → runs only cold compile (+reset) then test solidity", () => {
    const plan = summarize(planCommands(fixture(), ["test solidity"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        // reset + cold compile pulled in via dependsOn; edit steps skipped.
        runStepNames: ["reset files & cache", "cold compile"],
        emit: false,
        emitSteps: [], // prerequisites only — not reported
      },
      {
        name: "test solidity",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
    ]);
  });

  it("'warm compile' → skips the edit steps and test solidity", () => {
    const plan = summarize(planCommands(fixture(), ["warm compile"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        runStepNames: ["reset files & cache", "cold compile"],
        emit: false,
        emitSteps: [],
      },
      {
        name: "warm compile",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
      // "test solidity" is neither selected nor a prerequisite → dropped.
    ]);
  });

  it("'cold compile' (a step) → runs reset + cold compile, reports cold compile", () => {
    const plan = summarize(planCommands(fixture(), ["cold compile"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        runStepNames: ["reset files & cache", "cold compile"],
        emit: false,
        emitSteps: ["cold compile"],
      },
    ]);
  });

  it("one filter matches commands and steps alike (no level distinction)", () => {
    // "test solidity" is a single command; "cold compile" is a step — both are
    // selected by the same flag and reported.
    const plan = summarize(
      planCommands(fixture(), ["cold compile", "test solidity"]),
    );
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        runStepNames: ["reset files & cache", "cold compile"],
        emit: false,
        emitSteps: ["cold compile"],
      },
      {
        name: "test solidity",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
    ]);
  });

  it("glob '*compile*' selects compile-named entries across levels", () => {
    const plan = summarize(planCommands(fixture(), ["*compile*"]));
    // "cold compile" (a step) and "warm compile" (a command) match; the
    // "edit min"/"edit max" steps and "test solidity" do not.
    assert.deepEqual(plan[0].emitSteps, ["cold compile"]);
    assert.equal(plan.find((p) => p.name === "warm compile")?.emit, true);
    assert.equal(
      plan.find((p) => p.name === "test solidity"),
      undefined,
    );
  });

  it("'edit max' → pulls in its prerequisites but skips the unrelated 'edit min'", () => {
    const plan = summarize(planCommands(fixture(), ["edit max"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        // edit max dependsOn cold compile (not edit min) → edit min is skipped.
        runStepNames: ["reset files & cache", "cold compile", "edit max"],
        emit: false,
        emitSteps: ["edit max"],
      },
    ]);
  });

  it("no matches → empty plan (scenario skipped)", () => {
    assert.deepEqual(planCommands(fixture(), ["nope-*"]), []);
    // A measure:false step can never be selected on its own.
    assert.deepEqual(planCommands(fixture(), ["reset files & cache"]), []);
  });

  it("falls back to all-preceding entries when an entry declares no dependsOn", () => {
    const commands: Record<string, CommandConfig> = {
      "compile sequence": {
        runs: 1,
        steps: {
          reset: { command: "reset", measure: false },
          cold: { command: "compile" }, // no dependsOn
        },
      },
      // No dependsOn → conservatively runs everything before it.
      "test solidity": { runs: 1, command: "test --no-compile" },
    };
    const plan = summarize(planCommands(commands, ["test solidity"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        runStepNames: ["reset", "cold"], // all preceding steps run
        emit: false,
        emitSteps: [],
      },
      {
        name: "test solidity",
        runStepNames: undefined,
        emit: true,
        emitSteps: [],
      },
    ]);
  });

  it("throws on a dependsOn that names a nonexistent entry", () => {
    const commands: Record<string, CommandConfig> = {
      a: { runs: 1, command: "x" },
      b: { runs: 1, command: "y", dependsOn: ["ghost"] },
    };
    assert.throws(() => planCommands(commands, ["b"]), /dependsOn "ghost"/);
  });
});
