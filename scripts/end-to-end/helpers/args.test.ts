// cSpell:ignore scenaro -- a deliberate misspelling testing option validation
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  CLONE_DIR_FLAG,
  Command,
  DEFAULT_CLONE_DIR,
  givenCloneDirectory,
  resolveAndValidateArgs,
  resolveCloneDirectory,
} from "./args.ts";
import { withEnv } from "./with-env.ts";
import { ForceCheckout, ForcePublish, UseLocal } from "../subcommands/init.ts";

const INVOCATION_DIR = path.resolve("/invoked/from/here");
const FLAG_DIR = "from-flag";

describe("givenCloneDirectory", () => {
  const ENV_DIR = "from-env";

  it("prefers the flag over E2E_CLONE_DIR", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: ENV_DIR }, () => givenCloneDirectory(FLAG_DIR)),
      FLAG_DIR,
    );
  });

  it("falls back to E2E_CLONE_DIR without the flag", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: ENV_DIR }, () => givenCloneDirectory(undefined)),
      ENV_DIR,
    );
  });

  it("returns undefined when neither the flag nor E2E_CLONE_DIR is set", () => {
    assert.equal(
      withEnv({ E2E_CLONE_DIR: undefined }, () =>
        givenCloneDirectory(undefined),
      ),
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
  const scenarioDir = "/scenarios/x";
  const scenarioArgs = ["--scenario", scenarioDir];
  const scenarioFile = path.join(scenarioDir, "scenario.json");

  it("resolves the clone directory option against INIT_CWD", () => {
    const args = withEnv({ INIT_CWD: INVOCATION_DIR }, () =>
      resolveAndValidateArgs([
        "clean",
        ...scenarioArgs,
        CLONE_DIR_FLAG,
        FLAG_DIR,
      ]),
    );

    assert.equal(args?.e2eCloneDirectory, path.join(INVOCATION_DIR, FLAG_DIR));
  });

  it("accepts every documented option", () => {
    const args = resolveAndValidateArgs([
      "exec",
      ...scenarioArgs,
      "--command",
      "npx hardhat test",
      "--use-local",
      "--force-checkout",
      "--force-publish",
      CLONE_DIR_FLAG,
      "/clones",
    ]);

    assert.deepEqual(args, {
      command: Command.Exec,
      e2eCloneDirectory: "/clones",
      scenarioPath: scenarioFile,
      execCommand: "npx hardhat test",
      useLocal: UseLocal.Yes,
      forceCheckout: ForceCheckout.Yes,
      forcePublish: ForcePublish.Yes,
    });
  });

  it("falls back to E2E_SCENARIO when --scenario is absent", () => {
    const args = withEnv({ E2E_SCENARIO: scenarioDir }, () =>
      resolveAndValidateArgs(["clean", CLONE_DIR_FLAG, "/clones"]),
    );

    assert.equal(args?.scenarioPath, scenarioFile);
  });

  it("asks for the usage text for --help or a missing command, printing nothing itself", () => {
    const write = mock.method(process.stdout, "write", () => true);

    try {
      for (const args of [
        [],
        ["--help"],
        scenarioArgs,
        ["init", ...scenarioArgs, "--help"],
        ["clean", ...scenarioArgs, "-h"],
      ]) {
        const label = args.join(" ") || "no arguments";

        assert.equal(resolveAndValidateArgs(args), undefined, label);
      }

      assert.equal(write.mock.callCount(), 0);
    } finally {
      write.mock.restore();
    }
  });

  it("logs the default clone directory for a command given without one", () => {
    const write = mock.method(process.stdout, "write", () => true);

    try {
      withEnv({ E2E_CLONE_DIR: undefined }, () =>
        resolveAndValidateArgs(["clean", ...scenarioArgs]),
      );

      assert.match(String(write.mock.calls[0]?.arguments[0]), /defaulting to/);
    } finally {
      write.mock.restore();
    }
  });

  it("rejects a command without a scenario", () => {
    assert.throws(
      () =>
        withEnv({ E2E_SCENARIO: undefined }, () =>
          resolveAndValidateArgs(["init", CLONE_DIR_FLAG, FLAG_DIR]),
        ),
      /--scenario is required unless E2E_SCENARIO is set/,
    );
  });

  it("rejects more than one command", () => {
    assert.throws(
      () => resolveAndValidateArgs(["init", "exec", ...scenarioArgs]),
      /Only one command/,
    );
  });

  it("takes the command from the positionals, not from option values", () => {
    const args = resolveAndValidateArgs([
      "exec",
      ...scenarioArgs,
      "--command",
      "clean",
      CLONE_DIR_FLAG,
      "/clones",
    ]);

    assert.equal(args?.command, Command.Exec);
    assert.equal(args?.execCommand, "clean");
  });

  it("rejects an unknown command or option", () => {
    assert.throws(
      () => resolveAndValidateArgs(["clear", ...scenarioArgs]),
      /unknown command: clear/,
    );
    assert.throws(
      () => resolveAndValidateArgs(["init", "--scenaro", scenarioDir]),
      /Unknown option '--scenaro'/,
    );
  });
});
