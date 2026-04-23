import type { CallTrace, LogTrace } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CallKind, IncludeTraces, LogKind } from "@nomicfoundation/edr";
import { styleText } from "@nomicfoundation/hardhat-utils/style";

import {
  formatTraces,
  verbosityToIncludeTraces,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/trace-formatters.js";
import { DEFAULT_COLORIZER } from "../../../../../../src/internal/utils/colorizer.js";

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
[127552] ${styleText("green", "FailingCounterTest")}::${styleText("green", "setUp")}()
  ├─ [0] ${styleText("green", "console")}::${styleText("green", "log")}("Setting up") ${styleText("yellow", "[staticcall]")}
  ├─ [68915] ${styleText("yellow", "→ new")} Counter@0x373b22261122919Ad39F55ac0475dd0f82Bd2499
  │    └─ ${styleText("green", "←")} 344 bytes of code
  └─ [0] ${styleText("green", "console")}::${styleText("green", "log")}("Counter set up") ${styleText("yellow", "[staticcall]")}

[32272] ${styleText("green", "FailingCounterTest")}::${styleText("green", "testFailFuzzInc")}(1)
  ├─ [0] ${styleText("green", "console")}::${styleText("green", "log")}("Fuzz testing inc fail") ${styleText("yellow", "[staticcall]")}
  ├─ [22397] ${styleText("green", "Counter")}::${styleText("green", "inc")}()
  └─ [402] ${styleText("green", "Counter")}::${styleText("green", "x")}() ${styleText("yellow", "[staticcall]")}
       └─ ${styleText("green", "←")} 1`.replace("\n", "");

    const actual = formatTraces(traces, "", DEFAULT_COLORIZER);

    assert.equal(expected, actual);
  });

  it("should return an empty string for empty traces", async () => {
    const traces: CallTrace[] = [];

    const expected = "";

    const actual = formatTraces(traces, "  ", DEFAULT_COLORIZER);

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

    const actual = formatTraces([trace], "", DEFAULT_COLORIZER);

    assert.ok(
      actual.includes(styleText("yellow", "[event]")),
      "should contain yellow [event] tag",
    );
    assert.ok(
      actual.includes(`Transfer(${styleText("cyan", '"from", "to", "100"')})`),
      "should contain event name with cyan args",
    );
  });

  const rawEventCases: Array<{
    name: string;
    params: Uint8Array[];
    includes: string[];
    excludes: string[];
  }> = [
    {
      name: "1 element (data-only, no topics)",
      params: [new Uint8Array([0xab, 0xcd])],
      includes: ["data:"],
      excludes: ["topic 0:"],
    },
    {
      name: "3 elements (2 topics + data)",
      params: [
        new Uint8Array([0x01]),
        new Uint8Array([0x02]),
        new Uint8Array([0x03]),
      ],
      includes: ["topic 0:", "topic 1:", "data:"],
      excludes: [],
    },
    {
      name: "empty parameters",
      params: [],
      includes: [],
      excludes: ["[event]"],
    },
  ];

  for (const { name, params, includes, excludes } of rawEventCases) {
    it(`should format a raw event with ${name}`, () => {
      const trace = makeCallTrace({ children: [makeLogTrace(params)] });
      const actual = formatTraces([trace], "", DEFAULT_COLORIZER);

      for (const s of includes) {
        assert.ok(actual.includes(s), `should contain "${s}"`);
      }

      for (const s of excludes) {
        assert.ok(!actual.includes(s), `should not contain "${s}"`);
      }
    });
  }
});

describe("formatTrace call kind tags", () => {
  const kindTagCases: Array<{
    kind: CallKind;
    name: string;
    tag: string | undefined;
  }> = [
    { kind: CallKind.Call, name: "Call", tag: undefined },
    { kind: CallKind.StaticCall, name: "StaticCall", tag: "[staticcall]" },
    {
      kind: CallKind.DelegateCall,
      name: "DelegateCall",
      tag: "[delegatecall]",
    },
    { kind: CallKind.CallCode, name: "CallCode", tag: "[callcode]" },
  ];

  const allTags = ["[staticcall]", "[delegatecall]", "[callcode]"];

  for (const { kind, name, tag } of kindTagCases) {
    it(`should ${tag !== undefined ? `append ${tag}` : "append no tag"} for CallKind.${name}`, () => {
      const trace = makeCallTrace({ kind });
      const actual = formatTraces([trace], "", DEFAULT_COLORIZER);

      if (tag !== undefined) {
        assert.ok(
          actual.includes(styleText("yellow", tag)),
          `should contain ${tag}`,
        );
      }

      for (const other of allTags) {
        if (other !== tag) {
          assert.ok(!actual.includes(other), `should not contain ${other}`);
        }
      }
    });
  }

  it("should format Create with '→ new' prefix and no kind tag", () => {
    const trace = makeCallTrace({
      kind: CallKind.Create,
      contract: "MyToken",
      address: "0x1234",
    });
    const actual = formatTraces([trace], "", DEFAULT_COLORIZER);

    assert.ok(
      actual.includes(styleText("yellow", "→ new")),
      "should contain → new prefix",
    );
    assert.ok(
      actual.includes("MyToken@0x1234"),
      "should contain contract@address",
    );

    for (const tag of allTags) {
      assert.ok(!actual.includes(tag), `should not contain ${tag}`);
    }
  });
});

describe("formatTrace outputs and coloring", () => {
  const cases: Array<{
    name: string;
    overrides: Partial<CallTrace>;
    includes: string[];
  }> = [
    {
      name: "should show [Revert] for failed trace",
      overrides: { success: false, outputs: "EvmError: Revert" },
      includes: [styleText("red", "[Revert]"), "EvmError: Revert"],
    },
    {
      name: "should show ← arrow for normal output",
      overrides: { outputs: "42" },
      includes: [styleText("green", "←"), "42"],
    },
    {
      name: "should use red for failed traces",
      overrides: { success: false, contract: "FailContract" },
      includes: [styleText("red", "FailContract")],
    },
    {
      name: "should use blue for cheatcode traces",
      overrides: { isCheatcode: true, contract: "CheatContract" },
      includes: [styleText("blue", "CheatContract")],
    },
  ];

  for (const { name, overrides, includes } of cases) {
    it(name, () => {
      const trace = makeCallTrace(overrides);
      const actual = formatTraces([trace], "", DEFAULT_COLORIZER);
      for (const s of includes) {
        assert.ok(actual.includes(s), `should contain "${s}"`);
      }
    });
  }
});
