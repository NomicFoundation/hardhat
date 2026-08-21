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

// Compact view: what each planned command runs and reports. Step sequences
// carry `run` (ordered steps to execute), `once` (steps that execute on the
// final run only) and an `emit` list of reported steps; single commands carry
// only a boolean `emit`.
function summarize(plan: ReturnType<typeof planCommands>) {
  return plan.map((p) =>
    "run" in p
      ? { name: p.name, run: p.run, once: p.once, emit: p.emit }
      : { name: p.name, emit: p.emit },
  );
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
        run: ["reset files & cache", "cold compile", "edit min", "edit max"],
        once: [],
        emit: ["cold compile", "edit min", "edit max"],
      },
      {
        name: "warm compile",
        emit: true,
      },
      {
        name: "test solidity",
        emit: true,
      },
    ]);
  });

  it("'test solidity' (a single command) → runs only cold compile (+reset) then test solidity", () => {
    const plan = summarize(planCommands(fixture(), ["test solidity"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        // reset + cold compile pulled in via dependsOn; edit steps skipped.
        run: ["reset files & cache", "cold compile"],
        // The sequence runs purely as a cross-command prerequisite — its
        // dependent only needs to observe it having run once, so every step
        // is once and the sequence collapses to a single run.
        once: ["reset files & cache", "cold compile"],
        emit: [], // prerequisites only — not reported
      },
      {
        name: "test solidity",
        emit: true,
      },
    ]);
  });

  it("'warm compile' → skips the edit steps and test solidity", () => {
    const plan = summarize(planCommands(fixture(), ["warm compile"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        run: ["reset files & cache", "cold compile"],
        once: ["reset files & cache", "cold compile"],
        emit: [],
      },
      {
        name: "warm compile",
        emit: true,
      },
      // "test solidity" is neither selected nor a prerequisite → dropped.
    ]);
  });

  it("'cold compile' (a step) → runs reset + cold compile, reports cold compile", () => {
    const plan = summarize(planCommands(fixture(), ["cold compile"]));
    assert.deepEqual(plan, [
      {
        name: "compile sequence",
        run: ["reset files & cache", "cold compile"],
        // cold compile is measured, so it runs every iteration; reset is its
        // in-sequence prerequisite and runs every iteration with it.
        once: [],
        emit: ["cold compile"],
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
        run: ["reset files & cache", "cold compile"],
        once: [],
        emit: ["cold compile"],
      },
      {
        name: "test solidity",
        emit: true,
      },
    ]);
  });

  it("glob '*compile*' selects compile-named entries across levels", () => {
    const plan = summarize(planCommands(fixture(), ["*compile*"]));
    // "cold compile" (a step) and "warm compile" (a command) match; the
    // "edit min"/"edit max" steps and "test solidity" do not.
    assert.deepEqual(plan[0].emit, ["cold compile"]);
    assert.equal(plan.find((p) => p.name === "warm compile")!.emit, true);
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
        run: ["reset files & cache", "cold compile", "edit max"],
        // In-sequence prerequisites of a measured step run every iteration —
        // each edit max run expects reset + cold compile to have just run.
        once: [],
        emit: ["edit max"],
      },
    ]);
  });

  it("a step that only external entries depend on runs once, alongside measured steps", () => {
    const commands: Record<string, CommandConfig> = {
      seq: {
        runs: 3,
        steps: {
          reset: { command: "reset", measure: false },
          cold: { command: "compile", dependsOn: ["reset"] },
          warm: { command: "compile", dependsOn: ["cold"] },
        },
      },
      "test solidity": {
        runs: 5,
        command: "test --no-compile",
        dependsOn: ["warm"],
      },
    };
    const plan = summarize(planCommands(commands, ["cold", "test solidity"]));
    assert.deepEqual(plan, [
      {
        name: "seq",
        run: ["reset", "cold", "warm"],
        // cold is measured → every iteration, pulling reset along with it;
        // warm is only a cross-command prerequisite → final run only.
        once: ["warm"],
        emit: ["cold"],
      },
      {
        name: "test solidity",
        emit: true,
      },
    ]);
  });

  it("a command that only another command depends on runs unreported", () => {
    const commands: Record<string, CommandConfig> = {
      compile: { runs: 4, command: "compile" },
      "test solidity": {
        runs: 2,
        command: "test --no-compile",
        dependsOn: ["compile"],
      },
    };
    const plan = summarize(planCommands(commands, ["test solidity"]));
    assert.deepEqual(plan, [
      {
        name: "compile",
        // Prerequisite-only (emit: false) → the harness runs it a single time
        // instead of its configured 4.
        emit: false,
      },
      {
        name: "test solidity",
        emit: true,
      },
    ]);
  });

  it("no matches → empty plan (scenario skipped)", () => {
    assert.deepEqual(planCommands(fixture(), ["nope-*"]), []);
    // A measure:false step can never be selected on its own.
    assert.deepEqual(planCommands(fixture(), ["reset files & cache"]), []);
  });

  it("runs an entry with no dependsOn in isolation — no implicit prerequisites", () => {
    const commands: Record<string, CommandConfig> = {
      "compile sequence": {
        runs: 1,
        steps: {
          reset: { command: "reset", measure: false },
          cold: { command: "compile" }, // no dependsOn
        },
      },
      // No dependsOn → runs alone; the preceding sequence is NOT pulled in.
      "test solidity": { runs: 1, command: "test --no-compile" },
    };
    const plan = summarize(planCommands(commands, ["test solidity"]));
    assert.deepEqual(plan, [
      // "compile sequence" is entirely skipped — nothing selected depends on it.
      {
        name: "test solidity",
        emit: true,
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

  it("throws when a dependency is declared after the dependent entry", () => {
    const commands: Record<string, CommandConfig> = {
      // "a" depends on "b", but "b" is declared later — invalid ordering.
      a: { runs: 1, command: "x", dependsOn: ["b"] },
      b: { runs: 1, command: "y" },
    };
    assert.throws(
      () => planCommands(commands, ["a"]),
      /must be declared before the dependent entry/,
    );
  });

  it("throws on a self-dependency", () => {
    const commands: Record<string, CommandConfig> = {
      a: { runs: 1, command: "x", dependsOn: ["a"] },
    };
    assert.throws(
      () => planCommands(commands, ["a"]),
      /must be declared before the dependent entry/,
    );
  });
});
