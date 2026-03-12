import type { CallTrace, LogTrace } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CallKind, IncludeTraces, LogKind } from "@nomicfoundation/edr";
import chalk from "chalk";

function makeCallTrace(overrides: Partial<CallTrace> = {}): CallTrace {
  const trace: CallTrace = {
    kind: CallKind.Call,
    success: true,
    isCheatcode: false,
    gasUsed: 1000n,
    value: 0n,
    address: "0x1111111111111111111111111111111111111111",
    contract: "TestContract",
    inputs: { name: "testFunc", arguments: [] },
    outputs: new Uint8Array(),
    children: [],
    ...overrides,
  };
  return trace;
}

function makeLogTrace(parameters: LogTrace["parameters"]): LogTrace {
  const trace: LogTrace = { kind: LogKind.Log, parameters };
  return trace;
}

import {
  formatTraces,
  verbosityToIncludeTraces,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/trace-formatters.js";

describe("verbosityToIncludeTraces", () => {
  it("should return None for verbosity 0", () => {
    assert.equal(verbosityToIncludeTraces(0), IncludeTraces.None);
  });

  it("should return None for verbosity 1", () => {
    assert.equal(verbosityToIncludeTraces(1), IncludeTraces.None);
  });

  it("should return None for verbosity 2", () => {
    assert.equal(verbosityToIncludeTraces(2), IncludeTraces.None);
  });

  it("should return Failing for verbosity 3", () => {
    assert.equal(verbosityToIncludeTraces(3), IncludeTraces.Failing);
  });

  it("should return All for verbosity 4", () => {
    assert.equal(verbosityToIncludeTraces(4), IncludeTraces.All);
  });

  it("should return All for verbosity 5", () => {
    assert.equal(verbosityToIncludeTraces(5), IncludeTraces.All);
  });

  it("should return All for verbosity 6", () => {
    assert.equal(verbosityToIncludeTraces(6), IncludeTraces.All);
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
        address: "0x9Cded789F1564C12102E41634157434dd1De9fE3",
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
            address: "0x7c926CE5743033Cbe6f6cF7D6622EF70e05503A6",
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
            address: "0x373b22261122919Ad39F55ac0475dd0f82Bd2499",
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
            address: "0x7c926CE5743033Cbe6f6cF7D6622EF70e05503A6",
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
        address: "0x9Cded789F1564C12102E41634157434dd1De9fE3",
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
            address: "0x7c926CE5743033Cbe6f6cF7D6622EF70e05503A6",
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
            address: "0x373b22261122919Ad39F55ac0475dd0f82Bd2499",
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
            address: "0x373b22261122919Ad39F55ac0475dd0f82Bd2499",
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
  ├─ [68915] ${chalk.yellow("→ new")} Counter@0x373b22261122919Ad39F55ac0475dd0f82Bd2499
  │    └─ ${chalk.green("←")} 344 bytes of code
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

describe("formatLog via formatTraces", () => {
  it("should format a decoded event with [event] tag", () => {
    const trace = makeCallTrace({
      children: [
        makeLogTrace({
          name: "Transfer",
          arguments: ['"from"', '"to"', '"100"'],
        }),
      ],
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.yellow("[event]")),
      "should contain yellow [event] tag",
    );
    assert.ok(
      actual.includes(`Transfer(${chalk.cyan('"from", "to", "100"')})`),
      "should contain event name with cyan args",
    );
  });

  it("should format a raw event with 1 topic", () => {
    const trace = makeCallTrace({
      children: [makeLogTrace([new Uint8Array([0xab, 0xcd])])],
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(actual.includes("topic 0:"), "should contain topic 0");
    assert.ok(!actual.includes("data:"), "should not contain data line");
  });

  it("should format a raw event with 3 topics", () => {
    const trace = makeCallTrace({
      children: [
        makeLogTrace([
          new Uint8Array([0x01]),
          new Uint8Array([0x02]),
          new Uint8Array([0x03]),
        ]),
      ],
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(actual.includes("topic 0:"), "should contain topic 0");
    assert.ok(actual.includes("topic 1:"), "should contain topic 1");
    assert.ok(actual.includes("data:"), "should contain data line");
  });

  it("should handle a raw event with empty parameters", () => {
    const trace = makeCallTrace({
      children: [makeLogTrace([])],
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      !actual.includes("[event]"),
      "should not contain event line for empty parameters",
    );
  });
});

describe("formatTrace call kind tags", () => {
  it("should not append any tag for CallKind.Call", () => {
    const trace = makeCallTrace({ kind: CallKind.Call });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      !actual.includes("[staticcall]"),
      "should not contain [staticcall]",
    );
    assert.ok(
      !actual.includes("[delegatecall]"),
      "should not contain [delegatecall]",
    );
    assert.ok(!actual.includes("[callcode]"), "should not contain [callcode]");
  });

  it("should append [staticcall] tag for CallKind.StaticCall", () => {
    const trace = makeCallTrace({ kind: CallKind.StaticCall });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.yellow("[staticcall]")),
      "should contain yellow [staticcall] tag",
    );
  });

  it("should append [delegatecall] tag for CallKind.DelegateCall", () => {
    const trace = makeCallTrace({ kind: CallKind.DelegateCall });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.yellow("[delegatecall]")),
      "should contain yellow [delegatecall] tag",
    );
  });

  it("should append [callcode] tag for CallKind.CallCode", () => {
    const trace = makeCallTrace({ kind: CallKind.CallCode });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.yellow("[callcode]")),
      "should contain yellow [callcode] tag",
    );
  });

  it("should format Create with → new prefix and no kind tag", () => {
    const trace = makeCallTrace({
      kind: CallKind.Create,
      contract: "MyToken",
      address: "0x1234",
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.yellow("→ new")),
      "should contain → new prefix",
    );
    assert.ok(
      actual.includes("MyToken@0x1234"),
      "should contain contract@address",
    );
    assert.ok(
      !actual.includes("[staticcall]"),
      "should not contain [staticcall]",
    );
    assert.ok(
      !actual.includes("[delegatecall]"),
      "should not contain [delegatecall]",
    );
    assert.ok(!actual.includes("[callcode]"), "should not contain [callcode]");
  });
});

describe("formatTrace outputs", () => {
  it("should show [Revert] for EvmError: Revert output", () => {
    const trace = makeCallTrace({
      success: false,
      outputs: "EvmError: Revert",
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.red("[Revert]")),
      "should contain red [Revert]",
    );
    assert.ok(
      actual.includes("EvmError: Revert"),
      "should contain error message",
    );
  });

  it("should show arrow for normal string output", () => {
    const trace = makeCallTrace({ outputs: "42" });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(actual.includes(chalk.green("←")), "should contain green arrow");
    assert.ok(actual.includes("42"), "should contain output value");
  });
});

describe("formatNestedArray blank lines", () => {
  it("should not have blank lines for single trace", () => {
    const trace = makeCallTrace();
    const actual = formatTraces([trace], "", chalk);
    assert.ok(!actual.includes("\n\n"), "should not contain double newlines");
  });

  it("should insert blank lines between three top-level traces", () => {
    const traces = [
      makeCallTrace({ contract: "A" }),
      makeCallTrace({ contract: "B" }),
      makeCallTrace({ contract: "C" }),
    ];
    // formatTraces slices off trailing newline, so add it back to check internal structure
    const actual = formatTraces(traces, "", chalk) + "\n";
    const doubleNewlines = actual.match(/\n\n/g);
    assert.equal(
      doubleNewlines?.length,
      2,
      "should have exactly 2 blank line separators between 3 traces",
    );
  });
});

describe("events inside trace trees", () => {
  it("should render event between call children with correct connectors", () => {
    const trace = makeCallTrace({
      children: [
        makeCallTrace({ contract: "Child1" }),
        makeLogTrace({
          name: "Transfer",
          arguments: ['"a"', '"b"'],
        }),
        makeCallTrace({ contract: "Child2" }),
      ],
    });
    const actual = formatTraces([trace], "", chalk);
    // The event should use ├─ (non-last connector) since it is not the last child
    const eventLineIndex = actual
      .split("\n")
      .findIndex((line: string) => line.includes("[event]"));
    assert.ok(eventLineIndex !== -1, "should find event line");
    const eventLine = actual.split("\n")[eventLineIndex];
    assert.ok(
      eventLine.includes("├─"),
      "event between children should use ├─ connector",
    );
  });

  it("should render raw multi-topic event as nested subtree", () => {
    const trace = makeCallTrace({
      children: [
        makeLogTrace([
          new Uint8Array([0xaa]),
          new Uint8Array([0xbb]),
          new Uint8Array([0xcc]),
        ]),
      ],
    });
    const actual = formatTraces([trace], "", chalk);
    const lines = actual.split("\n");
    const topic0Line = lines.find((l: string) => l.includes("topic 0:"));
    assert.ok(topic0Line !== undefined, "should have topic 0 line");
    const topic1Line = lines.find((l: string) => l.includes("topic 1:"));
    assert.ok(topic1Line !== undefined, "should have topic 1 line");
    const dataLine = lines.find((l: string) => l.includes("data:"));
    assert.ok(dataLine !== undefined, "should have data line");
  });
});

describe("formatTrace coloring", () => {
  it("should use red for failed traces", () => {
    const trace = makeCallTrace({
      success: false,
      contract: "FailContract",
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.red("FailContract")),
      "should contain contract name in red",
    );
  });

  it("should use blue for cheatcode traces", () => {
    const trace = makeCallTrace({
      isCheatcode: true,
      contract: "CheatContract",
    });
    const actual = formatTraces([trace], "", chalk);
    assert.ok(
      actual.includes(chalk.blue("CheatContract")),
      "should contain contract name in blue",
    );
  });
});
