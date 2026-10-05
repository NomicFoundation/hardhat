import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  CLONE_DIR_FLAG,
  DEFAULT_CLONE_DIR,
  givenCloneDirectory,
  resolveAndValidateArgs,
  resolveCloneDirectory,
} from "./args.ts";
import { withEnv } from "./with-env.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");
const FLAG_DIR = "from-flag";

describe("givenCloneDirectory", () => {
  const ENV_DIR = "from-env";

  it("prefers the flag over E2E_CLONE_DIR", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: ENV_DIR }, () =>
        givenCloneDirectory([CLONE_DIR_FLAG, FLAG_DIR]),
      ),
      FLAG_DIR,
    );
  });

  it("falls back to E2E_CLONE_DIR without the flag", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: ENV_DIR }, () => givenCloneDirectory([])),
      ENV_DIR,
    );
  });

  it("returns undefined when neither the flag nor E2E_CLONE_DIR is set", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: undefined }, () => givenCloneDirectory([])),
      undefined,
    );
  });
});

describe("resolveCloneDirectory", () => {
  it("uses the default when none was given", () => {
    assert.equal(resolveCloneDirectory(undefined), DEFAULT_CLONE_DIR);
  });

  it("resolves a relative directory against INIT_CWD", () => {
    assert.equal(
      withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
        resolveCloneDirectory(FLAG_DIR),
      ),
      path.join(INVOCATION_DIR, FLAG_DIR),
    );
  });
});

describe("end-to-end resolveAndValidateArgs", () => {
  it("resolves the clone directory option against INIT_CWD", () => {
    const args = withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
      resolveAndValidateArgs([CLONE_DIR_FLAG, FLAG_DIR]),
    );

    assert.equal(args.e2eCloneDirectory, path.join(INVOCATION_DIR, FLAG_DIR));
  });
});
