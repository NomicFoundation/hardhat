import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  normalizeScenarioPath,
  resolveInvocationPath,
  resolveScenarioRepoDir,
  resolveScenarioWorkingDir,
} from "./directory.ts";
import { withEnv } from "./with-env.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");

const invoked = <T>(fn: () => T) => withEnv({ INIT_CWD: INVOCATION_DIR }, fn);

describe("resolveInvocationPath", () => {
  it("resolves a relative path against INIT_CWD when pnpm sets it", () => {
    assert.equal(
      invoked(() => resolveInvocationPath("out/report.json")),
      path.join(INVOCATION_DIR, "out", "report.json"),
    );
  });

  it("resolves against cwd without INIT_CWD", () => {
    assert.equal(
      withEnv({ INIT_CWD: undefined }, () =>
        resolveInvocationPath("report.json"),
      ),
      path.resolve("report.json"),
    );
  });

  it("passes an absolute path through unchanged", () => {
    const absolutePath = path.resolve("/tmp/x.json");

    assert.equal(
      invoked(() => resolveInvocationPath(absolutePath)),
      absolutePath,
    );
  });

  it("passes undefined through", () => {
    assert.equal(
      invoked(() => resolveInvocationPath(undefined)),
      undefined,
    );
  });
});

describe("normalizeScenarioPath", () => {
  const SCENARIO_DIR = "end-to-end/x";
  const SCENARIO_FILE = path.join(
    INVOCATION_DIR,
    SCENARIO_DIR,
    "scenario.json",
  );

  it("resolves a scenario directory against INIT_CWD and appends scenario.json", () => {
    assert.equal(
      invoked(() => normalizeScenarioPath(SCENARIO_DIR)),
      SCENARIO_FILE,
    );
  });

  it("does not append a second scenario.json when the path already names it", () => {
    assert.equal(
      invoked(() => normalizeScenarioPath(`${SCENARIO_DIR}/scenario.json`)),
      SCENARIO_FILE,
    );
  });
});

describe("resolveScenarioRepoDir", () => {
  it("clones into the scenario's slug under the clone directory", () => {
    assert.equal(
      resolveScenarioRepoDir(
        "/tmp/end-to-end",
        "/repo/end-to-end/some-scenario/scenario.json",
      ),
      path.join("/tmp/end-to-end", "some-scenario"),
    );
  });
});

describe("resolveScenarioWorkingDir", () => {
  const REPO_DIR = path.resolve("/tmp/end-to-end/some-scenario");

  it("is the clone itself without a workingDirectory", () => {
    assert.equal(resolveScenarioWorkingDir(REPO_DIR, undefined), REPO_DIR);
  });

  it("is the workingDirectory inside the clone", () => {
    assert.equal(
      resolveScenarioWorkingDir(REPO_DIR, "contracts"),
      path.join(REPO_DIR, "contracts"),
    );
  });
});
