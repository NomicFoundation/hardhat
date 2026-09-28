import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveArgs } from "./regression.ts";
import { withEnv } from "../end-to-end/helpers/with-env.ts";

describe("resolveArgs", () => {
  it("resolves every path option against INIT_CWD", () => {
    const invocationDir = path.resolve("/invoked/from/here");
    const output = "out/report.json";
    const cloneDir = "clones";

    const args = withEnv({ INIT_CWD: invocationDir }, () =>
      resolveArgs(["--output", output, "--e2e-clone-dir", cloneDir]),
    );

    assert.deepEqual(
      { output: args?.output, e2eCloneDirectory: args?.e2eCloneDirectory },
      {
        output: path.join(invocationDir, output),
        e2eCloneDirectory: path.join(invocationDir, cloneDir),
      },
    );
  });
});
