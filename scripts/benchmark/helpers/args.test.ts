import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./args.ts";
import { withEnv } from "../../end-to-end/helpers/with-env.ts";

describe("benchmark resolveAndValidateArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const invocationDir = path.resolve("/invoked/from/here");
    const scenarioDir = "end-to-end/x";
    const exportJson = "out/report.json";
    const cloneDir = "clones";

    const args = withEnv({ INIT_CWD: invocationDir }, () =>
      resolveAndValidateArgs([
        "--scenario",
        scenarioDir,
        "--export-json",
        exportJson,
        "--e2e-clone-dir",
        cloneDir,
      ]),
    );

    assert.deepEqual(
      {
        scenarioPath: args?.scenarioPath,
        exportJson: args?.exportJson,
        e2eCloneDirectory: args?.e2eCloneDirectory,
      },
      {
        scenarioPath: path.join(invocationDir, scenarioDir, "scenario.json"),
        exportJson: path.join(invocationDir, exportJson),
        e2eCloneDirectory: path.join(invocationDir, cloneDir),
      },
    );
  });
});
