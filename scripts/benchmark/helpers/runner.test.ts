import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatOutput,
  parseCpuTiming,
  shellQuote,
  wrapWithCpuTiming,
} from "./runner.ts";

describe("wrapWithCpuTiming", () => {
  it("wraps the command in bash's time builtin, reporting to the file", () => {
    assert.equal(
      wrapWithCpuTiming("npx hardhat compile", "/tmp/cpu.txt"),
      "{ LC_NUMERIC=C; TIMEFORMAT='%U %S'; time { npx hardhat compile\n} 2>&3 ; } 3>&2 2>/tmp/cpu.txt",
    );
  });

  it("quotes a timing path with spaces", () => {
    assert.match(
      wrapWithCpuTiming("true", "/tmp/dir with spaces/cpu.txt"),
      /2>'\/tmp\/dir with spaces\/cpu\.txt'$/,
    );
  });

  it("keeps shell operators inside the timed block", () => {
    const wrapped = wrapWithCpuTiming("a && b >> log", "/tmp/cpu.txt");
    assert.match(wrapped, /time \{ a && b >> log\n\}/);
  });
});

describe("parseCpuTiming", () => {
  it("parses user and system seconds", () => {
    assert.deepEqual(parseCpuTiming("1.25 0.75\n", "x"), {
      user: 1.25,
      system: 0.75,
    });
  });

  it("throws on unparseable content", () => {
    assert.throws(() => parseCpuTiming("", "/tmp/cpu.txt"), /\/tmp\/cpu\.txt/);
    assert.throws(() => parseCpuTiming("no numbers here", "x"));
  });

  it("throws when the system time is missing", () => {
    assert.throws(() => parseCpuTiming("1.25\n", "x"));
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
