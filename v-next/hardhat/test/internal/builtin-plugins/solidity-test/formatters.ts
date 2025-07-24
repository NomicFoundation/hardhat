import type { CallTrace } from "@ignored/edr-optimism";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import chalk from "chalk";

import {
  formatLogs,
  formatTraces,
} from "../../../../src/internal/builtin-plugins/solidity-test/formatters.js";

describe("formatLogs", () => {
  it("should format logs correctly", async () => {
    const lines = ["a", "b", "c"];

    const actual = `  a
  b
  c`;

    const expected = formatLogs(lines, 2, chalk);

    assert.equal(expected, chalk.grey(actual));
  });

  it("should return an empty string for empty logs", async () => {
    const lines: string[] = [];

    const expected = "";

    const actual = formatLogs(lines, 2, chalk);

    assert.equal(expected, actual);
  });
});

describe("formatTraces", () => {
  it("should format traces correctly", async () => {
    const traces = [
      {
        kind: 0,
        success: true,
        isCheatcode: false,
        gasUsed: 127552n,
        value: 0n,
        contract: "FailingCounterTest",
        inputs: { name: "setUp", arguments: [] },
        outputs: new Uint8Array(),
        children: [
          {
            kind: 3,
            success: true,
            isCheatcode: false,
            gasUsed: 0n,
            value: 0n,
            contract: "console",
            inputs: { name: "log", arguments: ['"Setting up"'] },
            outputs: new Uint8Array(),
            children: [],
          },
          {
            kind: 4,
            success: true,
            isCheatcode: false,
            gasUsed: 68915n,
            value: 0n,
            contract: "Counter",
            inputs: new Uint8Array([1, 2, 3]),
            outputs: "344 bytes of code",
            children: [],
          },
          {
            kind: 3,
            success: true,
            isCheatcode: false,
            gasUsed: 0n,
            value: 0n,
            contract: "console",
            inputs: { name: "log", arguments: ['"Counter set up"'] },
            outputs: new Uint8Array(),
            children: [],
          },
        ],
      },
      {
        kind: 0,
        success: true,
        isCheatcode: false,
        gasUsed: 32272n,
        value: 0n,
        contract: "FailingCounterTest",
        inputs: { name: "testFailFuzzInc", arguments: ["1"] },
        outputs: new Uint8Array(),
        children: [
          {
            kind: 3,
            success: true,
            isCheatcode: false,
            gasUsed: 0n,
            value: 0n,
            contract: "console",
            inputs: { name: "log", arguments: ['"Fuzz testing inc fail"'] },
            outputs: new Uint8Array(),
            children: [],
          },
          {
            kind: 0,
            success: true,
            isCheatcode: false,
            gasUsed: 22397n,
            value: 0n,
            contract: "Counter",
            inputs: { name: "inc", arguments: [] },
            outputs: new Uint8Array(),
            children: [],
          },
          {
            kind: 3,
            success: true,
            isCheatcode: false,
            gasUsed: 402n,
            value: 0n,
            contract: "Counter",
            inputs: { name: "x", arguments: [] },
            outputs: "1",
            children: [],
          },
        ],
      },
    ];

    const expected = `
[127552] ${chalk.green("FailingCounterTest")}::${chalk.green("setUp")}()
  ├─ [0] ${chalk.green("console")}::${chalk.green("log")}("Setting up") ${chalk.yellow("[staticcall]")}
  ├─ [68915] ${chalk.yellow("→ new")} Counter
  |    └─ ${chalk.green("←")} 344 bytes of code
  └─ [0] ${chalk.green("console")}::${chalk.green("log")}("Counter set up") ${chalk.yellow("[staticcall]")}
[32272] ${chalk.green("FailingCounterTest")}::${chalk.green("testFailFuzzInc")}(1)
  ├─ [0] ${chalk.green("console")}::${chalk.green("log")}("Fuzz testing inc fail") ${chalk.yellow("[staticcall]")}
  ├─ [22397] ${chalk.green("Counter")}::${chalk.green("inc")}()
  └─ [402] ${chalk.green("Counter")}::${chalk.green("x")}() ${chalk.yellow("[staticcall]")}
       └─ ${chalk.green("←")} 1`.replace("\n", "");

    const actual = formatTraces(traces, "", chalk);

    assert.equal(expected, actual);
  });

  it("should return an empty string for empty traces", async () => {
    const traces: CallTrace[] = [];

    const expected = "";

    const actual = formatTraces(traces, "  ", chalk);

    assert.equal(expected, actual);
  });
});
