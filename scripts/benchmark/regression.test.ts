import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveArgs } from "./regression.ts";
import { withEnv } from "../end-to-end/helpers/with-env.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");

describe("resolveArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const args = withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
      resolveArgs(["--output", "out/report.json", "--e2e-clone-dir", "clones"]),
    );

    assert.deepEqual(
      { output: args?.output, e2eCloneDirectory: args?.e2eCloneDirectory },
      {
        output: path.join(INVOCATION_DIR, "out", "report.json"),
        e2eCloneDirectory: path.join(INVOCATION_DIR, "clones"),
      },
    );
  });
});
