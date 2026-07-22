import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readTimeOutput, wrapWithTime } from "./gnu-time.ts";

const tmp = mkdtempSync(path.join(tmpdir(), "gnu-time-test-"));
const fileWith = (name: string, contents: string) => {
  const p = path.join(tmp, name);
  writeFileSync(p, contents);
  return p;
};

describe("wrapWithTime", () => {
  it("wraps a lone program without an inner shell", () => {
    assert.equal(
      wrapWithTime("hyperfine --runs 3 'npx hardhat compile'", "/t/m", false),
      "/usr/bin/time -o '/t/m' -f '%U %S %M' hyperfine --runs 3 'npx hardhat compile'",
    );
  });

  it("wraps a shell command under sh -c so operators are covered", () => {
    assert.equal(
      wrapWithTime("printf x >> f && npx hardhat compile", "/t/m", true),
      `/usr/bin/time -o '/t/m' -f '%U %S %M' sh -c 'printf x >> f && npx hardhat compile'`,
    );
  });

  it("escapes single quotes in the wrapped command", () => {
    assert.equal(
      wrapWithTime("echo 'hi'", "/t/m", true),
      `/usr/bin/time -o '/t/m' -f '%U %S %M' sh -c 'echo '\\''hi'\\'''`,
    );
  });
});

describe("readTimeOutput", () => {
  it("parses user/system seconds and peak RSS KB rounded to MB", () => {
    assert.deepEqual(readTimeOutput(fileWith("a", "12.34 5.67 1268340\n")), {
      user: 12.34,
      system: 5.67,
      peakRssMb: 1239,
    });
  });

  it("skips a 'Command exited' line and matches the measurement line", () => {
    const p = fileWith(
      "b",
      "Command exited with non-zero status 1\n0.10 0.20 524288\n",
    );
    assert.deepEqual(readTimeOutput(p), {
      user: 0.1,
      system: 0.2,
      peakRssMb: 512,
    });
  });

  it("throws for a missing file", () => {
    assert.throws(() => readTimeOutput(path.join(tmp, "does-not-exist")));
  });

  it("throws when no measurement line is present", () => {
    assert.throws(() => readTimeOutput(fileWith("c", "no measurements here")));
  });
});
