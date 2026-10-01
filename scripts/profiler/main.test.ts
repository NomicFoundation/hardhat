import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./main.ts";
import { withEnv } from "../end-to-end/helpers/with-env.ts";

describe("profiler resolveAndValidateArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const invocationDir = path.resolve("/invoked/from/here");
    const scenarioDir = "end-to-end/x";
    const outDir = "out";
    const cloneDir = "clones";

    const args = withEnv({ INIT_CWD: invocationDir }, () =>
      resolveAndValidateArgs([
        "--scenario",
        scenarioDir,
        "--command",
        "true",
        "--out-dir",
        outDir,
        "--e2e-clone-dir",
        cloneDir,
      ]),
    );

    assert.deepEqual(
      {
        scenarioPaths: args?.scenarioPaths,
        outDir: args?.outDir,
        e2eCloneDirectory: args?.e2eCloneDirectory,
      },
      {
        scenarioPaths: [path.join(invocationDir, scenarioDir, "scenario.json")],
        outDir: path.join(invocationDir, outDir),
        e2eCloneDirectory: path.join(invocationDir, cloneDir),
      },
    );
  });
});
