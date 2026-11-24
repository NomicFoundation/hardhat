import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { runScript, scenarioScript, tracedCommands } from "./shell.ts";

describe("scenarioScript", () => {
  const dir = mkdtempSync(join(tmpdir(), "acceptance-shell-"));

  after(() => rmSync(dir, { recursive: true, force: true }));

  function run(block: string) {
    const path = join(dir, "scenario.sh");
    writeFileSync(path, scenarioScript(block));

    return runScript(path, dir, { PATH: process.env.PATH ?? "" });
  }

  it("passes a block whose commands all succeed", () => {
    assert.equal(run("true\necho done | cat").exitCode, 0);
  });

  it("stops at the first failing command", () => {
    const { exitCode, output } = run("echo before\nfalse\necho after");

    assert.notEqual(exitCode, 0);
    assert.match(output, /before/);
    assert.doesNotMatch(output, /after/);
  });

  it("fails on a failing command that is not last in a pipeline", () => {
    const { exitCode, output } = run("false | cat\necho after");

    assert.notEqual(exitCode, 0);
    assert.doesNotMatch(output, /after/);
  });

  it("captures stderr alongside stdout", () => {
    assert.match(run("echo oops >&2").output, /oops/);
  });

  it("traces each command as it runs, expanded", () => {
    const { output } = run('NAME=hardhat\necho "$NAME"');

    assert.deepEqual(tracedCommands(output), ["NAME=hardhat", "echo hardhat"]);
  });

  it("traces the command that failed, and none after it", () => {
    const { output } = run("echo before\nfalse\necho after");

    assert.deepEqual(tracedCommands(output), ["echo before", "false"]);
  });
});
