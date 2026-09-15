import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BASH,
  CommandFailedError,
  formatOutput,
  parseCpuTiming,
  runMeasured,
  runSeries,
  shellQuote,
  wrapWithCpuTiming,
} from "./runner.ts";
import { procSamplingAvailable, SAMPLE_INTERVAL_MS } from "./mem-sampler.ts";

// These suites drive the runner end to end, so they need the shell it spawns.
const HAS_BASH = existsSync(BASH);

// Call at module scope: a file-root after() still runs when the suites are
// skipped or filtered out, so the directory never leaks.
function tempTimingPath(prefix: string): { dir: string; timingPath: string } {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  after(() => rmSync(dir, { recursive: true, force: true }));

  return { dir, timingPath: path.join(dir, "cpu.txt") };
}

const measuredTmp = tempTimingPath("runner-test-");
const seriesTmp = tempTimingPath("runner-series-test-");

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

describe("shellQuote", () => {
  it("leaves plain words unquoted", () => {
    assert.equal(shellQuote("/tmp/file-1.txt"), "/tmp/file-1.txt");
  });

  it("quotes values with spaces and shell operators", () => {
    assert.equal(shellQuote("a b && c"), "'a b && c'");
  });

  it("escapes embedded single quotes", () => {
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
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
  const { dir, timingPath } = measuredTmp;

  it("measures a command and keeps its stderr out of the report", async () => {
    const run = await runMeasured("echo out; echo err >&2", timingPath, 0, {
      cwd: dir,
    });

    assert.ok(run.wallSeconds > 0);
    assert.match(
      readFileSync(timingPath, "utf-8").trim(),
      /^\d+\.\d{3} \d+\.\d{3}$/,
    );
  });

  it("still reports CPU time when the command exits at the top level", async () => {
    await runMeasured("echo ok; exit 0", timingPath, 0, { cwd: dir });

    assert.match(
      readFileSync(timingPath, "utf-8").trim(),
      /^\d+\.\d{3} \d+\.\d{3}$/,
    );
  });

  it("spawns the shell even when the scenario env drops it from PATH", async () => {
    const run = await runMeasured(":", timingPath, 0, {
      cwd: dir,
      env: { PATH: "/nonexistent-bin" },
    });

    assert.ok(run.wallSeconds > 0);
  });

  it("rejects a failing command with its captured output", async () => {
    await assert.rejects(
      runMeasured("echo boom >&2; exit 3", timingPath, 0, { cwd: dir }),
      (error: unknown) => {
        assert.ok(error instanceof CommandFailedError);
        assert.match(error.message, /exited with code 3/);
        assert.match(error.stderr, /boom/);
        return true;
      },
    );
  });

  it("tolerates a non-zero exit under ignoreFailure", async () => {
    await runMeasured("exit 3", timingPath, 0, {
      cwd: dir,
      ignoreFailure: true,
    });

    assert.match(
      readFileSync(timingPath, "utf-8").trim(),
      /^\d+\.\d{3} \d+\.\d{3}$/,
    );
  });

  it(
    "reports the peak RSS of the largest process in the tree",
    { skip: !procSamplingAvailable() },
    async () => {
      const allocMib = 64;
      const holdMs = SAMPLE_INTERVAL_MS * 3;
      const run = await runMeasured(
        `${shellQuote(process.execPath)} -e "Buffer.alloc(${allocMib} << 20, 1); setTimeout(() => {}, ${holdMs})"`,
        timingPath,
        0,
        { cwd: dir },
      );

      assert.ok((run.peakRssMb ?? 0) >= allocMib, `peakRssMb=${run.peakRssMb}`);
    },
  );
});

describe("runSeries (subprocess)", { skip: !HAS_BASH }, () => {
  const { dir, timingPath } = seriesTmp;

  it("returns one measurement per configured run", async () => {
    const runs = await runSeries("true", timingPath, { cwd: dir, runs: 2 });

    assert.equal(runs.length, 2);
  });

  it("runs warmups before measured runs and reports both", async () => {
    const events: string[] = [];

    await runSeries("true", timingPath, {
      cwd: dir,
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
      runSeries("true", timingPath, { cwd: dir, runs: 1, prepare }),
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
      runSeries("true", timingPath, {
        cwd: dir,
        runs: 1,
        prepare: "exit 7",
        ignoreFailure: true,
      }),
      /Prepare command failed/,
    );
  });
});
