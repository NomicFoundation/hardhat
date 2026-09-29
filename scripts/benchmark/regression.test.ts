import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveArgs } from "./regression.ts";
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

  it("rejects an unknown option", () => {
    assert.throws(
      () => resolveArgs(["--output", "x", "--scenario", "y"]),
      /unknown option: --scenario/,
    );
  });

  it("rejects a positional argument", () => {
    assert.throws(
      () => resolveArgs(["--output", "x", "--fail-fast", "stray"]),
      /unexpected argument: stray/,
    );
  });
});
