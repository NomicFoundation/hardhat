import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { resolveNodeConnectionParams } from "../../../../../src/internal/builtin-plugins/node/utils/resolve-node-connection-params.js";

describe("resolveNodeConnectionParams", () => {
  // Mirrors the option defaults registered by the `node` task: chainId and
  // forkBlockNumber use -1 as the "not set" sentinel.
  const baseArgs = { chainId: -1, forkBlockNumber: -1 };

  it("sets the network name", () => {
    const result = resolveNodeConnectionParams("node", { ...baseArgs });

    assert.equal(result.network, "node");
  });

  it("sets override.chainId when chainId is provided", () => {
    const result = resolveNodeConnectionParams("node", {
      ...baseArgs,
      chainId: 1234,
    });

    assert.equal(result.override?.chainId, 1234);
  });

  it("does not set chainId when it is the -1 sentinel", () => {
    const result = resolveNodeConnectionParams("node", { ...baseArgs });

    assert.equal(result.override?.chainId, undefined);
  });

  it("sets override.forking when a fork url is provided", () => {
    const result = resolveNodeConnectionParams("node", {
      ...baseArgs,
      fork: "https://example.com/rpc",
    });

    assert.equal(result.override?.forking?.enabled, true);
    assert.equal(result.override?.forking?.url, "https://example.com/rpc");
    assert.equal(result.override?.forking?.blockNumber, undefined);
  });

  it("sets override.forking.blockNumber when fork and forkBlockNumber are provided", () => {
    const result = resolveNodeConnectionParams("node", {
      ...baseArgs,
      fork: "https://example.com/rpc",
      forkBlockNumber: 42,
    });

    assert.equal(result.override?.forking?.blockNumber, 42);
  });

  it("throws when forkBlockNumber is provided without a fork url", () => {
    assertThrowsHardhatError(
      () =>
        resolveNodeConnectionParams("node", {
          ...baseArgs,
          forkBlockNumber: 42,
        }),
      HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
      { argument: "fork" },
    );
  });

  it("sets chainType when a supported chainType is provided", () => {
    const result = resolveNodeConnectionParams("node", {
      ...baseArgs,
      chainType: "l1",
    });

    assert.equal(result.chainType, "l1");
  });

  it("throws for an unsupported chainType", () => {
    assertThrowsHardhatError(
      () =>
        resolveNodeConnectionParams("node", {
          ...baseArgs,
          chainType: "not-a-chain-type",
        }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      { value: "not-a-chain-type", type: "ChainType", name: "chainType" },
    );
  });
});
