import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./args.ts";
import { withEnv } from "../../end-to-end/helpers/with-env.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");

describe("benchmark resolveAndValidateArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const args = withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
      resolveAndValidateArgs([
        "--scenario",
        "end-to-end/x",
        "--export-json",
        "out/report.json",
        "--e2e-clone-dir",
        "clones",
      ]),
    );

    assert.deepEqual(
      {
        scenarioPath: args?.scenarioPath,
        exportJson: args?.exportJson,
        e2eCloneDirectory: args?.e2eCloneDirectory,
      },
      {
        scenarioPath: path.join(
          INVOCATION_DIR,
          "end-to-end",
          "x",
          "scenario.json",
        ),
        exportJson: path.join(INVOCATION_DIR, "out", "report.json"),
        e2eCloneDirectory: path.join(INVOCATION_DIR, "clones"),
      },
    );
  });
});
