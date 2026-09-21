import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createPeakRssRecorder,
  GNU_TIME_PATH,
  parseGnuTimeMaxRssMb,
  PeakRssMethod,
  resolvePeakRssMethod,
  wrapWithGnuTime,
  type PeakRssAvailability,
} from "./peak-rss.ts";
import { procSamplingAvailable } from "./mem-sampler.ts";

// 1.5 MB in kB: a value whose MB conversion is not an integer, so a
// truncating conversion cannot pass for the rounding one.
const PEAK_RSS_KB = 1536;
const PEAK_RSS_MB = 2;

const REPORT_PATH = "/tmp/mem.txt";

const AVAILABILITY = {
  both: { gnuTime: true, sampler: true },
  gnuTimeOnly: { gnuTime: true, sampler: false },
  samplerOnly: { gnuTime: false, sampler: true },
  neither: { gnuTime: false, sampler: false },
} satisfies Record<string, PeakRssAvailability>;

describe("wrapWithGnuTime", () => {
  it("runs the command through its own shell under GNU time", () => {
    assert.equal(
      wrapWithGnuTime("npx hardhat compile", REPORT_PATH),
      `${GNU_TIME_PATH} -f '%M' -o ${REPORT_PATH} /bin/bash -c 'npx hardhat compile'`,
    );
  });

  it("quotes a report path with spaces", () => {
    assert.match(
      wrapWithGnuTime("true", "/tmp/dir with spaces/mem.txt"),
      /-o '\/tmp\/dir with spaces\/mem\.txt'/,
    );
  });

  it("keeps shell operators inside the quoted command", () => {
    assert.match(
      wrapWithGnuTime("a && b >> log", REPORT_PATH),
      /-c 'a && b >> log'$/,
    );
  });
});

describe("parseGnuTimeMaxRssMb", () => {
  it("converts the reported kB to whole MB", () => {
    assert.equal(parseGnuTimeMaxRssMb(`${PEAK_RSS_KB}\n`, "x"), PEAK_RSS_MB);
  });

  it("reads past the prefix line GNU time adds on a non-zero exit", () => {
    assert.equal(
      parseGnuTimeMaxRssMb(
        `Command exited with non-zero status 3\n${PEAK_RSS_KB}\n`,
        "x",
      ),
      PEAK_RSS_MB,
    );
  });

  it("reads past the prefix line GNU time adds on a signal", () => {
    assert.equal(
      parseGnuTimeMaxRssMb(
        `Command terminated by signal 9\n${PEAK_RSS_KB}\n`,
        "x",
      ),
      PEAK_RSS_MB,
    );
  });

  it("names the report file when the content is unparseable", () => {
    assert.throws(
      () => parseGnuTimeMaxRssMb("", REPORT_PATH),
      new RegExp(REPORT_PATH),
    );
  });

  it("rejects a non-integer or non-positive reading", () => {
    assert.throws(() => parseGnuTimeMaxRssMb("no numbers here", "x"));
    assert.throws(() => parseGnuTimeMaxRssMb("1.5\n", "x"));
    assert.throws(() => parseGnuTimeMaxRssMb("0\n", "x"));
  });

  it("rejects a report that holds only the failure prefix line", () => {
    assert.throws(() =>
      parseGnuTimeMaxRssMb("Command exited with non-zero status 3\n", "x"),
    );
    assert.throws(() =>
      parseGnuTimeMaxRssMb("Command terminated by signal 9\n", "x"),
    );
  });
});

describe("resolvePeakRssMethod", () => {
  it("honours an available explicit request", () => {
    assert.equal(
      resolvePeakRssMethod(PeakRssMethod.GnuTime, AVAILABILITY.both),
      PeakRssMethod.GnuTime,
    );
    assert.equal(
      resolvePeakRssMethod(PeakRssMethod.Sampler, AVAILABILITY.both),
      PeakRssMethod.Sampler,
    );
  });

  it("names the missing package when GNU time is requested but absent", () => {
    assert.throws(
      () =>
        resolvePeakRssMethod(PeakRssMethod.GnuTime, AVAILABILITY.samplerOnly),
      /\/usr\/bin\/time.*apt-get install -y time/s,
    );
  });

  it("throws when the sampler is requested but /proc is unusable", () => {
    assert.throws(
      () =>
        resolvePeakRssMethod(PeakRssMethod.Sampler, AVAILABILITY.gnuTimeOnly),
      /Peak-RSS sampling is unavailable/,
    );
  });

  it("prefers GNU time without a request", () => {
    assert.equal(
      resolvePeakRssMethod(undefined, AVAILABILITY.both),
      PeakRssMethod.GnuTime,
    );
  });

  it("falls back to the sampler without GNU time", () => {
    assert.equal(
      resolvePeakRssMethod(undefined, AVAILABILITY.samplerOnly),
      PeakRssMethod.Sampler,
    );
  });

  it("measures nothing when no method is available", () => {
    assert.equal(
      resolvePeakRssMethod(undefined, AVAILABILITY.neither),
      undefined,
    );
  });
});

// Module scope: a file-root after() still runs when the suite is skipped or
// filtered out, so the directory never leaks.
const recorderTmpDir = mkdtempSync(
  path.join(tmpdir(), "peak-rss-recorder-test-"),
);
after(() => rmSync(recorderTmpDir, { recursive: true, force: true }));

describe("createPeakRssRecorder", () => {
  const memPath = path.join(recorderTmpDir, "mem.txt");

  it("passes the command through and measures nothing without a method", () => {
    const recorder = createPeakRssRecorder(undefined, memPath);

    assert.equal(recorder.wrapCommand("true"), "true");
    assert.equal(recorder.finish(), undefined);
  });

  it("reports nothing measured when GNU time never wrote its report", () => {
    rmSync(memPath, { force: true });

    assert.equal(
      createPeakRssRecorder(PeakRssMethod.GnuTime, memPath).finish(),
      undefined,
    );

    writeFileSync(memPath, "");

    assert.equal(
      createPeakRssRecorder(PeakRssMethod.GnuTime, memPath).finish(),
      undefined,
    );
  });

  it("reads the GNU time report it wrapped the command for", () => {
    const recorder = createPeakRssRecorder(PeakRssMethod.GnuTime, memPath);

    assert.match(recorder.wrapCommand("true"), new RegExp(`-o ${memPath} `));

    writeFileSync(memPath, `${PEAK_RSS_KB}\n`);

    assert.equal(recorder.finish(), PEAK_RSS_MB);
  });

  it(
    "lets the sampler be cancelled before observing, and repeatedly after",
    { skip: !procSamplingAvailable() },
    () => {
      createPeakRssRecorder(PeakRssMethod.Sampler, memPath).cancel();

      const recorder = createPeakRssRecorder(PeakRssMethod.Sampler, memPath);
      recorder.observe(process.pid);
      recorder.cancel();
      recorder.cancel();
    },
  );
});
