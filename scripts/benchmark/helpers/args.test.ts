import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./args.ts";
import { PeakRssMethod } from "./peak-rss.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../../end-to-end/subcommands/init.ts";
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

  it("accepts every documented option", () => {
    const args = resolveAndValidateArgs([
      "--scenario",
      "/scenarios/x",
      "--command",
      "npx hardhat test",
      "--init",
      "--use-local",
      "--force-checkout",
      "--force-publish",
      "--precompile",
      "--prepare",
      "npx hardhat clean",
      "--warmup",
      "2",
      "--runs",
      "3",
      "--ignore-failure",
      "--show-output",
      "--peak-rss",
      "sampler",
      "--export-json",
      "/out/report.json",
      "--e2e-clone-dir",
      "/clones",
    ]);

    assert.deepEqual(args, {
      scenarioPath: "/scenarios/x/scenario.json",
      command: "npx hardhat test",
      init: true,
      useLocal: UseLocal.Yes,
      forceCheckout: ForceCheckout.Yes,
      forcePublish: ForcePublish.Yes,
      precompile: true,
      prepare: "npx hardhat clean",
      ignoreFailure: true,
      showOutput: true,
      peakRssMethod: PeakRssMethod.Sampler,
      warmup: 2,
      runs: 3,
      exportJson: "/out/report.json",
      e2eCloneDirectory: "/clones",
    });
  });

  it("skips the bare -- separator that pnpm forwards", () => {
    const args = resolveAndValidateArgs(["--", "--scenario", "/scenarios/x"]);

    assert.equal(args?.scenarioPath, "/scenarios/x/scenario.json");
  });

  it("asks for the usage text on --help and -h", () => {
    for (const flag of ["--help", "-h"]) {
      assert.equal(resolveAndValidateArgs([flag]), undefined, flag);
    }
  });

  it("rejects an unknown option", () => {
    assert.throws(
      () => resolveAndValidateArgs(["--scenario", "x", "--run", "3"]),
      /unknown option: --run/,
    );
  });

  it("rejects a positional argument", () => {
    assert.throws(
      () => resolveAndValidateArgs(["--scenario", "x", "--init", "stray"]),
      /unexpected argument: stray/,
    );
  });
});
