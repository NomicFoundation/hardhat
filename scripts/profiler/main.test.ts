import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./main.ts";
import { withEnv } from "../end-to-end/helpers/with-env.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");

describe("profiler resolveAndValidateArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const args = withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
      resolveAndValidateArgs([
        "--scenario",
        "end-to-end/x",
        "--command",
        "true",
        "--out-dir",
        "out",
        "--e2e-clone-dir",
        "clones",
      ]),
    );

    assert.deepEqual(
      {
        scenarioPaths: args?.scenarioPaths,
        outDir: args?.outDir,
        e2eCloneDirectory: args?.e2eCloneDirectory,
      },
      {
        scenarioPaths: [
          path.join(INVOCATION_DIR, "end-to-end", "x", "scenario.json"),
        ],
        outDir: path.join(INVOCATION_DIR, "out"),
        e2eCloneDirectory: path.join(INVOCATION_DIR, "clones"),
      },
    );
  });
});
