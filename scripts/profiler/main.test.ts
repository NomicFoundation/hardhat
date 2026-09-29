import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveAndValidateArgs } from "./main.ts";
import { Mode } from "./helpers/args.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../end-to-end/subcommands/init.ts";
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

  it("accepts every documented option", () => {
    const args = resolveAndValidateArgs([
      "--scenario",
      "/scenarios/x",
      "--scenario",
      "/scenarios/y",
      "--command",
      "test",
      "--prepare",
      "clean",
      "--mode",
      "js",
      "--sample-rate",
      "500",
      "--out-dir",
      "/out",
      "--env",
      "A=1",
      "--env",
      "B=2",
      "--init",
      "--use-local",
      "--force-checkout",
      "--force-publish",
      "--show-output",
      "--keep-perf-data",
      "--e2e-clone-dir",
      "/clones",
    ]);

    assert.deepEqual(args, {
      scenarioPaths: [
        "/scenarios/x/scenario.json",
        "/scenarios/y/scenario.json",
      ],
      commandOrName: "test",
      prepareOrName: "clean",
      mode: Mode.Js,
      sampleRateHz: 500,
      outDir: "/out",
      env: { A: "1", B: "2" },
      init: true,
      useLocal: UseLocal.Yes,
      forceCheckout: ForceCheckout.Yes,
      forcePublish: ForcePublish.Yes,
      showOutput: true,
      keepPerfData: true,
      e2eCloneDirectory: "/clones",
    });
  });
});
