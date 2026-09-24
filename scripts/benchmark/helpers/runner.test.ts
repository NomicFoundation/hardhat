import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CommandFailedError,
  formatOutput,
  measureShellSpawnOverhead,
  NO_SPAWN_OVERHEAD,
  parseCpuTiming,
  reportPathsIn,
  runMeasured,
  runSeries,
  wrapWithCpuTiming,
  type MeasuredRun,
  type ReportPaths,
  type SpawnOverhead,
} from "./runner.ts";
import { gnuTimeAvailable, PeakRssMethod } from "./peak-rss.ts";
import { procSamplingAvailable, SAMPLE_INTERVAL_MS } from "./mem-sampler.ts";
import { BASH, shellQuote } from "./shell.ts";

// These suites drive the runner end to end, so they need the shell it spawns.
const HAS_BASH = existsSync(BASH);

// The sampler only sees the allocation while the process is alive, so the
// child holds it for several sampling intervals.
const ALLOC_MB = 64;
const ALLOC_HOLD_MS = SAMPLE_INTERVAL_MS * 3;
const ALLOC_COMMAND = `${shellQuote(process.execPath)} -e "Buffer.alloc(${ALLOC_MB} << 20, 1); setTimeout(() => {}, ${ALLOC_HOLD_MS})"`;

// Both methods read the same kernel counter, so they differ only by the
// child's run-to-run heap noise and the whole-MB rounding.
const METHOD_AGREEMENT_MB = 8;

// No measured command in this suite comes near an hour of CPU, so every
// calibrated figure lands below 0 before clamping.
const SECONDS_PER_HOUR = 3600;
const HOUR_LONG_OVERHEAD: SpawnOverhead = {
  wallSeconds: SECONDS_PER_HOUR,
  user: SECONDS_PER_HOUR,
  system: SECONDS_PER_HOUR,
};

function assertPeakCoversAllocation(run: MeasuredRun): void {
  assert.ok((run.peakRssMb ?? 0) >= ALLOC_MB, `peakRssMb=${run.peakRssMb}`);
}

// bash's `time` report as written by wrapWithCpuTiming: "<user> <system>".
const CPU_REPORT_PATTERN = /^\d+\.\d{3} \d+\.\d{3}$/;

// Call at module scope: a file-root after() still runs when the suites are
// skipped or filtered out, so the directory never leaks.
function tempReports(prefix: string): { dir: string; reports: ReportPaths } {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  after(() => rmSync(dir, { recursive: true, force: true }));

  return { dir, reports: reportPathsIn(dir, "run") };
}

const measuredTmp = tempReports("runner-test-");
const gnuTimeTmp = tempReports("runner-gnu-time-test-");
const seriesTmp = tempReports("runner-series-test-");

describe("wrapWithCpuTiming", () => {
  it("wraps the command in bash's time builtin, reporting to the file", () => {
    assert.equal(
      wrapWithCpuTiming("npx hardhat compile", "/tmp/cpu.txt"),
      "{ TIMEFORMAT='%U %S'; time { ( npx hardhat compile\n) ; } 2>&3 ; } 3>&2 2>/tmp/cpu.txt",
    );
  });

  it("quotes a timing path with spaces", () => {
    assert.match(
      wrapWithCpuTiming("true", "/tmp/dir with spaces/cpu.txt"),
      /2>'\/tmp\/dir with spaces\/cpu\.txt'$/,
    );
  });

  it("keeps shell operators inside the timed subshell", () => {
    const wrapped = wrapWithCpuTiming("a && b >> log", "/tmp/cpu.txt");
    assert.match(wrapped, /time \{ \( a && b >> log\n\) ; \}/);
  });
});

describe("parseCpuTiming", () => {
  it("parses user and system seconds", () => {
    assert.deepEqual(parseCpuTiming("1.25 0.75\n", "x"), {
      user: 1.25,
      system: 0.75,
    });
  });

  it("parses a comma decimal separator from a non-C locale", () => {
    assert.deepEqual(parseCpuTiming("0,003 0,001\n", "x"), {
      user: 0.003,
      system: 0.001,
    });
  });

  it("throws on unparseable content", () => {
    assert.throws(() => parseCpuTiming("", "/tmp/cpu.txt"), /\/tmp\/cpu\.txt/);
    assert.throws(() => parseCpuTiming("no numbers here", "x"));
  });

  it("throws when the system time is missing", () => {
    assert.throws(() => parseCpuTiming("1.25\n", "x"));
  });

  it("throws on unexpected extra tokens", () => {
    assert.throws(() => parseCpuTiming("1.25 0.75 0.99\n", "x"));
    assert.throws(() => parseCpuTiming("stray output\n1.25 0.75\n", "x"));
  });
});

describe("formatOutput", () => {
  it("renders only non-empty streams", () => {
    assert.equal(
      formatOutput({ stdout: "hello\n", stderr: "" }),
      "  --- stdout ---\nhello",
    );
  });

  it("renders both streams in order", () => {
    assert.equal(
      formatOutput({ stdout: "out", stderr: "err" }),
      "  --- stdout ---\nout\n  --- stderr ---\nerr",
    );
  });

  it("renders nothing when both streams are empty", () => {
    assert.equal(formatOutput({ stdout: undefined, stderr: "" }), "");
  });
});

describe("runMeasured (subprocess)", { skip: !HAS_BASH }, () => {
  const { dir, reports } = measuredTmp;
  const options = { cwd: dir, peakRssMethod: undefined };

  it("measures a command and keeps its stderr out of the report", async () => {
    const run = await runMeasured(
      "echo out; echo err >&2",
      reports,
      NO_SPAWN_OVERHEAD,
      options,
    );

    assert.ok(run.wallSeconds > 0);
    assert.match(
      readFileSync(reports.cpuTimingPath, "utf-8").trim(),
      CPU_REPORT_PATTERN,
    );
  });

  it("still reports CPU time when the command exits at the top level", async () => {
    await runMeasured("echo ok; exit 0", reports, NO_SPAWN_OVERHEAD, options);

    assert.match(
      readFileSync(reports.cpuTimingPath, "utf-8").trim(),
      CPU_REPORT_PATTERN,
    );
  });

  it("spawns the shell even when the scenario env drops it from PATH", async () => {
    const run = await runMeasured(":", reports, NO_SPAWN_OVERHEAD, {
      ...options,
      env: { PATH: "/nonexistent-bin" },
    });

    assert.ok(run.wallSeconds > 0);
  });

  it("rejects a failing command with its captured output", async () => {
    await assert.rejects(
      runMeasured("echo boom >&2; exit 3", reports, NO_SPAWN_OVERHEAD, options),
      (error: unknown) => {
        assert.ok(error instanceof CommandFailedError);
        assert.match(error.message, /exited with code 3/);
        assert.match(error.stderr, /boom/);
        return true;
      },
    );
  });

  it("tolerates a non-zero exit under ignoreFailure", async () => {
    await runMeasured("exit 3", reports, NO_SPAWN_OVERHEAD, {
      ...options,
      ignoreFailure: true,
    });

    assert.match(
      readFileSync(reports.cpuTimingPath, "utf-8").trim(),
      CPU_REPORT_PATTERN,
    );
  });

  it("clamps CPU time at 0 when the overhead exceeds the measurement", async () => {
    const run = await runMeasured(":", reports, HOUR_LONG_OVERHEAD, options);

    assert.equal(run.user, 0);
    assert.equal(run.system, 0);
    assert.equal(run.wallSeconds, 0);
  });

  it("measures no peak RSS without a method", async () => {
    const run = await runMeasured(
      ALLOC_COMMAND,
      reports,
      NO_SPAWN_OVERHEAD,
      options,
    );

    assert.equal(run.peakRssMb, undefined);
  });

  it("discards the previous run's reports before measuring", async () => {
    const staleCpuSeconds = 9;
    writeFileSync(reports.peakRssPath, "999999\n");
    writeFileSync(
      reports.cpuTimingPath,
      `${staleCpuSeconds}.000 ${staleCpuSeconds}.000\n`,
    );

    const run = await runMeasured(":", reports, NO_SPAWN_OVERHEAD, options);

    assert.equal(run.peakRssMb, undefined);
    assert.ok(!existsSync(reports.peakRssPath));
    assert.ok(run.user < staleCpuSeconds);
  });

  it(
    "reports the peak RSS of the largest process in the tree",
    { skip: !procSamplingAvailable() },
    async () => {
      const run = await runMeasured(ALLOC_COMMAND, reports, NO_SPAWN_OVERHEAD, {
        ...options,
        peakRssMethod: PeakRssMethod.Sampler,
      });

      assertPeakCoversAllocation(run);
    },
  );
});

describe(
  "runMeasured with GNU time (subprocess)",
  { skip: !HAS_BASH || !gnuTimeAvailable() },
  () => {
    const { dir, reports } = gnuTimeTmp;
    const options = { cwd: dir, peakRssMethod: PeakRssMethod.GnuTime };

    it("reports the peak RSS of the largest process alongside the CPU report", async () => {
      const run = await runMeasured(
        ALLOC_COMMAND,
        reports,
        NO_SPAWN_OVERHEAD,
        options,
      );

      assertPeakCoversAllocation(run);
      assert.match(
        readFileSync(reports.cpuTimingPath, "utf-8").trim(),
        CPU_REPORT_PATTERN,
      );
    });

    it("reports the peak RSS of a child that exited non-zero", async () => {
      const run = await runMeasured(
        `${ALLOC_COMMAND}; exit 3`,
        reports,
        NO_SPAWN_OVERHEAD,
        {
          ...options,
          ignoreFailure: true,
        },
      );

      assertPeakCoversAllocation(run);
    });

    it("rejects a failing command with the command's own exit code", async () => {
      await assert.rejects(
        runMeasured("exit 3", reports, NO_SPAWN_OVERHEAD, options),
        (error: unknown) => {
          assert.ok(error instanceof CommandFailedError);
          assert.match(error.message, /exited with code 3/);
          return true;
        },
      );
    });

    it(
      "agrees with the sampler on the same allocation",
      { skip: !procSamplingAvailable() },
      async () => {
        const gnuTime = await runMeasured(
          ALLOC_COMMAND,
          reports,
          NO_SPAWN_OVERHEAD,
          options,
        );
        const sampler = await runMeasured(
          ALLOC_COMMAND,
          reports,
          NO_SPAWN_OVERHEAD,
          {
            ...options,
            peakRssMethod: PeakRssMethod.Sampler,
          },
        );

        assert.ok(
          Math.abs((gnuTime.peakRssMb ?? 0) - (sampler.peakRssMb ?? 0)) <=
            METHOD_AGREEMENT_MB,
          `gnuTime=${gnuTime.peakRssMb} sampler=${sampler.peakRssMb}`,
        );
      },
    );
  },
);

describe("measureShellSpawnOverhead (subprocess)", { skip: !HAS_BASH }, () => {
  it("reports a finite, non-negative wall, user and system overhead", async () => {
    const overhead = await measureShellSpawnOverhead(undefined);

    for (const [field, seconds] of Object.entries(overhead)) {
      assert.ok(Number.isFinite(seconds), `${field}=${seconds}`);
      assert.ok(seconds >= 0, `${field}=${seconds}`);
    }
  });
});

describe("runSeries (subprocess)", { skip: !HAS_BASH }, () => {
  const { dir, reports } = seriesTmp;
  const options = { cwd: dir, peakRssMethod: undefined };

  it("returns one measurement per configured run", async () => {
    const runs = await runSeries("true", reports, { ...options, runs: 2 });

    assert.equal(runs.length, 2);
  });

  it("runs warmups before measured runs and reports both", async () => {
    const events: string[] = [];

    await runSeries("true", reports, {
      ...options,
      runs: 2,
      warmup: 1,
      onWarmupCompleted: (i, total) => events.push(`warmup ${i + 1}/${total}`),
      onRunCompleted: (_run, i, total) => events.push(`run ${i + 1}/${total}`),
    });

    assert.deepEqual(events, ["warmup 1/1", "run 1/2", "run 2/2"]);
  });

  it("attributes a prepare failure to the hook", async () => {
    const prepare = "echo prep-err >&2; exit 7";

    await assert.rejects(
      runSeries("true", reports, { ...options, runs: 1, prepare }),
      (error: unknown) => {
        assert.ok(error instanceof CommandFailedError);
        assert.match(error.message, /^Prepare command failed/);
        assert.equal(error.command, prepare);
        assert.match(error.stderr, /prep-err/);
        return true;
      },
    );
  });

  it("does not let ignoreFailure suppress a prepare failure", async () => {
    await assert.rejects(
      runSeries("true", reports, {
        ...options,
        runs: 1,
        prepare: "exit 7",
        ignoreFailure: true,
      }),
      /Prepare command failed/,
    );
  });
});
