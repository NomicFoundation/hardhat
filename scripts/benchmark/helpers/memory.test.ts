import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  formatTimeCommand,
  gnuTimeAvailable,
  readPeakRssMb,
  wrapWithTime,
} from "./memory.ts";

const tmp = mkdtempSync(path.join(tmpdir(), "mem-test-"));
const memFileWith = (name: string, contents: string) => {
  const p = path.join(tmp, name);
  writeFileSync(p, contents);
  return p;
};

describe("formatTimeCommand", () => {
  it("wraps a lone program without an inner shell", () => {
    assert.equal(
      formatTimeCommand(
        "hyperfine --runs 3 'npx hardhat compile'",
        "/t/m",
        false,
      ),
      "/usr/bin/time -o '/t/m' -f %M hyperfine --runs 3 'npx hardhat compile'",
    );
  });

  it("wraps a shell command under sh -c so operators are covered", () => {
    assert.equal(
      formatTimeCommand("printf x >> f && npx hardhat compile", "/t/m", true),
      `/usr/bin/time -o '/t/m' -f %M sh -c 'printf x >> f && npx hardhat compile'`,
    );
  });

  it("escapes single quotes in the wrapped command", () => {
    assert.equal(
      formatTimeCommand("echo 'hi'", "/t/m", true),
      `/usr/bin/time -o '/t/m' -f %M sh -c 'echo '\\''hi'\\'''`,
    );
  });
});

describe("wrapWithTime", () => {
  it("is a no-op when GNU time is unavailable (returns the command unchanged)", () => {
    // This sandbox has no /usr/bin/time; assert the graceful fallback.
    if (!gnuTimeAvailable()) {
      assert.equal(
        wrapWithTime("npx hardhat compile", "/t/m", false),
        "npx hardhat compile",
      );
    } else {
      assert.match(
        wrapWithTime("npx hardhat compile", "/t/m", false),
        /^\/usr\/bin\/time /,
      );
    }
  });
});

describe("readPeakRssMb", () => {
  it("parses KB and rounds to MB", () => {
    assert.equal(readPeakRssMb(memFileWith("a", "1268340\n")), 1239);
  });

  it("ignores a trailing 'Command exited' line (takes the first integer)", () => {
    const p = memFileWith(
      "b",
      "524288\nCommand exited with non-zero status 1\n",
    );
    assert.equal(readPeakRssMb(p), 512);
  });

  it("returns undefined for a missing file", () => {
    assert.equal(readPeakRssMb(path.join(tmp, "does-not-exist")), undefined);
  });

  it("returns undefined for non-numeric content", () => {
    assert.equal(readPeakRssMb(memFileWith("c", "no digits here")), undefined);
  });
});
