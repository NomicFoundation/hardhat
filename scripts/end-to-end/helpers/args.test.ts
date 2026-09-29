// cSpell:ignore outpt -- a deliberate misspelling testing flag validation
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  CLONE_DIR_FLAG,
  DEFAULT_CLONE_DIR,
  assertOnlyFlags,
  givenCloneDirectory,
  isHelpRequested,
  parsePositionalArgs,
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

describe("parsePositionalArgs", () => {
  it("collects tokens that are neither flags nor flag values", () => {
    assert.deepEqual(
      parsePositionalArgs(
        ["render", "/run-dir", "--title", "cpu profile"],
        ["--title"],
      ),
      ["render", "/run-dir"],
    );
  });

  it("excludes the value following a value flag", () => {
    assert.deepEqual(
      parsePositionalArgs(["--output", "out.svg", "fold"], ["--output"]),
      ["fold"],
    );
  });

  it("treats a boolean flag's neighbor as positional, not its value", () => {
    assert.deepEqual(
      parsePositionalArgs(["--dry-run", "stray"], [], ["--dry-run"]),
      ["stray"],
    );
  });

  it("returns an empty array for flag-only args", () => {
    assert.deepEqual(
      parsePositionalArgs(
        ["--title", "x", "--dry-run"],
        ["--title"],
        ["--dry-run"],
      ),
      [],
    );
  });

  it("skips the bare -- separator that pnpm forwards", () => {
    assert.deepEqual(
      parsePositionalArgs(["--", "--output", "x", "fold"], ["--output"]),
      ["fold"],
    );
  });

  it("consumes a single-dash token as a flag's value", () => {
    assert.deepEqual(parsePositionalArgs(["--output", "-"], ["--output"]), []);
  });

  it("rejects unknown flags", () => {
    assert.throws(
      () => parsePositionalArgs(["--outpt", "x"], ["--output"]),
      /unknown option: --outpt/,
    );
  });

  it("rejects a single-dash token as an unknown option", () => {
    assert.throws(() => parsePositionalArgs(["-x"], []), /unknown option: -x/);
  });

  it("rejects a flag missing its value", () => {
    assert.throws(
      () => parsePositionalArgs(["--output"], ["--output"]),
      /--output requires a value/,
    );
  });

  it("rejects a flag whose value looks like a flag", () => {
    assert.throws(
      () =>
        parsePositionalArgs(
          ["--output", "--title", "x"],
          ["--output", "--title"],
        ),
      /--output requires a value/,
    );
  });
});

describe("assertOnlyFlags", () => {
  it("accepts known flags with their values", () => {
    assertOnlyFlags(
      ["--output", "x", "--dry-run"],
      ["--output"],
      ["--dry-run"],
    );
  });

  it("rejects the first positional argument by name", () => {
    assert.throws(
      () => assertOnlyFlags(["--dry-run", "stray", "other"], [], ["--dry-run"]),
      /unexpected argument: stray/,
    );
  });
});

describe("isHelpRequested", () => {
  it("recognizes --help and -h anywhere in the arguments", () => {
    for (const flag of ["--help", "-h"]) {
      assert.equal(isHelpRequested(["--scenario", "x", flag]), true, flag);
    }
  });

  it("does not treat a bare help token as the flag", () => {
    assert.equal(isHelpRequested(["--scenario", "x", "help"]), false);
  });
});
