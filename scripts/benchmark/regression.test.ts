import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveArgs, scenarioFailureMessage } from "./regression.ts";
import { CommandFailedError } from "./helpers/runner.ts";
import { PeakRssMethod } from "./helpers/peak-rss.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../end-to-end/subcommands/init.ts";
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

  it("accepts every documented option", () => {
    const args = resolveArgs([
      "--output",
      "/out/report.json",
      "--scenarios",
      "1inch*, ens",
      "--tag",
      "solidity",
      "--benchmarks",
      "*compile*,test",
      "--use-local",
      "--force-checkout",
      "--force-publish",
      "--e2e-clone-dir",
      "/clones",
      "--fail-fast",
      "--peak-rss",
      "sampler",
    ]);

    assert.deepEqual(args, {
      output: "/out/report.json",
      scenarios: ["1inch*", "ens"],
      tag: "solidity",
      benchmarks: ["*compile*", "test"],
      useLocal: UseLocal.Yes,
      forceCheckout: ForceCheckout.Yes,
      forcePublish: ForcePublish.Yes,
      e2eCloneDirectory: "/clones",
      failFast: true,
      peakRssMethod: PeakRssMethod.Sampler,
    });
  });

  it("skips the bare -- separator that pnpm forwards", () => {
    const args = resolveArgs(["--", "--output", "/out/report.json"]);

    assert.equal(args?.output, "/out/report.json");
  });

  it("asks for the usage text on --help and -h", () => {
    for (const flag of ["--help", "-h"]) {
      assert.equal(resolveArgs([flag]), undefined, flag);
    }
  });

  it("rejects a missing --output", () => {
    assert.throws(
      () => resolveArgs(["--fail-fast"]),
      /--output is required\nRun `pnpm bench:regression --help` for usage\./,
    );
  });

  it("rejects an unknown option", () => {
    assert.throws(
      () => resolveArgs(["--output", "x", "--scenario", "y"]),
      /Unknown option '--scenario'/,
    );
  });

  it("rejects a positional argument", () => {
    assert.throws(
      () => resolveArgs(["--output", "x", "--fail-fast", "stray"]),
      /Unexpected argument 'stray'/,
    );
  });
});

describe("scenarioFailureMessage", () => {
  it("appends a failed command's captured output", () => {
    const message = scenarioFailureMessage(
      "ens",
      new CommandFailedError(
        "Spawn-overhead calibration failed: exit 127",
        "",
        "bash: time: not found",
      ),
    );

    assert.equal(
      message,
      'Scenario "ens" failed: Spawn-overhead calibration failed: exit 127\n  --- stderr ---\nbash: time: not found',
    );
  });

  it("names the scenario and the message for any other error", () => {
    assert.equal(
      scenarioFailureMessage("ens", new Error("boom")),
      'Scenario "ens" failed: boom',
    );
    assert.equal(
      scenarioFailureMessage("ens", "boom"),
      'Scenario "ens" failed: boom',
    );
  });
});
