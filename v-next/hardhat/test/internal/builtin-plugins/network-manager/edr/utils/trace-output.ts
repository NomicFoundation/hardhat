import type { CallTrace, Response } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CallKind } from "@nomicfoundation/edr";

import { TraceOutputManager } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/trace-output.js";

function makeCallTrace(overrides: Partial<CallTrace> = {}): CallTrace {
  return {
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
}

function mockResponse(traces: CallTrace[]): Response {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  minimal mock: only callTraces() is used by outputCallTraces */
  return { callTraces: () => traces } as unknown as Response;
}

describe("TraceOutputManager", () => {
  it("should print traces when callTraces returns non-empty array", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    manager.outputCallTraces(
      mockResponse([makeCallTrace()]),
      "eth_sendTransaction",
      "0xabc",
      false,
    );

    assert.equal(lines.length, 1, "Should have printed one output");
    assert.ok(
      lines[0].includes("TestContract"),
      "Output should contain the trace",
    );
  });

  it("should not print when callTraces returns empty array", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    manager.outputCallTraces(
      mockResponse([]),
      "eth_sendTransaction",
      "0xabc",
      false,
    );

    assert.equal(lines.length, 0, "Should not have printed anything");
  });

  it("should deduplicate by txHash at verbosity < 5", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    const response = mockResponse([makeCallTrace()]);
    manager.outputCallTraces(response, "eth_sendTransaction", "0xabc", false);
    manager.outputCallTraces(
      response,
      "eth_getTransactionReceipt",
      "0xabc",
      false,
    );

    assert.equal(lines.length, 1, "Should print only once for the same txHash");
  });

  it("should include connection label and method in header", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      3,
      "myNetwork",
      4,
    );

    manager.outputCallTraces(
      mockResponse([makeCallTrace()]),
      "eth_sendTransaction",
      "0xabc",
      false,
    );

    assert.equal(lines.length, 1);
    assert.ok(
      lines[0].includes("connection #3 (myNetwork)"),
      "Header should contain the connection label",
    );
    assert.ok(
      lines[0].includes("eth_sendTransaction"),
      "Header should contain the method name",
    );
  });

  it("should suppress eth_estimateGas on success", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    manager.outputCallTraces(
      mockResponse([makeCallTrace()]),
      "eth_estimateGas",
      undefined,
      false,
    );

    assert.equal(
      lines.length,
      0,
      "Should suppress successful eth_estimateGas traces",
    );
  });

  it("should show eth_estimateGas on failure", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    manager.outputCallTraces(
      mockResponse([makeCallTrace()]),
      "eth_estimateGas",
      undefined,
      true,
    );

    assert.equal(lines.length, 1, "Should show failed eth_estimateGas traces");
  });

  it("should bypass dedup and suppression at verbosity >= 5", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      5,
    );

    const response = mockResponse([makeCallTrace()]);

    // Same txHash twice, both should print at verbosity 5
    manager.outputCallTraces(response, "eth_sendTransaction", "0xabc", false);
    manager.outputCallTraces(
      response,
      "eth_getTransactionReceipt",
      "0xabc",
      false,
    );

    assert.equal(lines.length, 2, "Verbosity >= 5 should bypass dedup");

    // eth_estimateGas on success should also print
    manager.outputCallTraces(response, "eth_estimateGas", undefined, false);

    assert.equal(lines.length, 3, "Verbosity >= 5 should bypass suppression");
  });

  it("should re-print after clearTracedHashes", () => {
    const lines: string[] = [];
    const manager = new TraceOutputManager(
      (line) => lines.push(line),
      0,
      "testnet",
      4,
    );

    const response = mockResponse([makeCallTrace()]);
    manager.outputCallTraces(response, "eth_sendTransaction", "0xabc", false);
    assert.equal(lines.length, 1);

    manager.clearTracedHashes();

    manager.outputCallTraces(response, "eth_sendTransaction", "0xabc", false);
    assert.equal(
      lines.length,
      2,
      "Should print again after clearing traced hashes",
    );
  });
});
