import type { EdrNetworkConfig } from "../../../../../src/types/config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyCoverageNetworkOverrides } from "../../../../../src/internal/builtin-plugins/network-manager/utils/apply-coverage-network-overrides.js";

describe("applyCoverageNetworkOverrides", () => {
  function makeEdrConfigStub(
    overrides: Partial<EdrNetworkConfig> = {},
  ): EdrNetworkConfig {
    return {
      type: "edr-simulated",
      accounts: [],
      chainId: 31337,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      allowBlocksWithSameTimestamp: false,
      allowUnlimitedContractSize: false,
      coinbase: new Uint8Array(20),
      hardfork: "osaka",
      initialDate: new Date(),
      loggingEnabled: false,
      minGasPrice: 0n,
      mining: { auto: true, interval: 0, mempool: { order: "fifo" } },
      networkId: 31337,
      throwOnCallFailures: true,
      throwOnTransactionFailures: true,
      ...overrides,
    };
  }

  it("should return the config unchanged when coverage is disabled", () => {
    const config = makeEdrConfigStub({
      allowUnlimitedContractSize: false,
      blockGasLimit: undefined,
      transactionGasCap: undefined,
    });

    const result = applyCoverageNetworkOverrides(config, false);

    assert.equal(result, config);
  });

  describe("when coverage is enabled", () => {
    it("should force allowUnlimitedContractSize on, overriding an explicit user value", () => {
      const config = makeEdrConfigStub({ allowUnlimitedContractSize: false });

      const result = applyCoverageNetworkOverrides(config, true);

      assert.equal(result.allowUnlimitedContractSize, true);
    });

    it("should disable blockGasLimit when the user has not set it", () => {
      const config = makeEdrConfigStub({ blockGasLimit: undefined });

      const result = applyCoverageNetworkOverrides(config, true);

      assert.equal(result.blockGasLimit, false);
    });

    it("should preserve an explicit blockGasLimit value", () => {
      const config = makeEdrConfigStub({ blockGasLimit: 42_000_000n });

      const result = applyCoverageNetworkOverrides(config, true);

      assert.equal(result.blockGasLimit, 42_000_000n);
    });

    it("should disable transactionGasCap when the user has not set it", () => {
      const config = makeEdrConfigStub({ transactionGasCap: undefined });

      const result = applyCoverageNetworkOverrides(config, true);

      assert.equal(result.transactionGasCap, false);
    });

    it("should preserve an explicit transactionGasCap value", () => {
      const config = makeEdrConfigStub({ transactionGasCap: 1_000_000n });

      const result = applyCoverageNetworkOverrides(config, true);

      assert.equal(result.transactionGasCap, 1_000_000n);
    });
  });
});
