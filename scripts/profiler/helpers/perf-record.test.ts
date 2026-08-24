import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wrapWithPerfCpu } from "./perf-record.ts";
import { shellQuote } from "./shell.ts";

describe("wrapWithPerfCpu", () => {
  it("wraps the command in a call-graph cpu-clock record", () => {
    assert.equal(
      wrapWithPerfCpu("npx hardhat compile", "/out/perf.data", 999),
      "perf 'record' '-e' 'cpu-clock' '-F' '999' '-g' '-o' '/out/perf.data' -- bash -c 'npx hardhat compile'",
    );
  });

  it("quotes embedded single quotes safely", () => {
    const wrapped = wrapWithPerfCpu("echo 'hi'", "/out/perf.data", 99);
    assert.ok(wrapped.includes(`bash -c 'echo '\\''hi'\\'''`));
  });
});

describe("shellQuote", () => {
  it("wraps in single quotes", () => {
    assert.equal(shellQuote("plain"), "'plain'");
  });

  it("escapes embedded single quotes", () => {
    assert.equal(shellQuote("a'b"), `'a'\\''b'`);
  });
});
