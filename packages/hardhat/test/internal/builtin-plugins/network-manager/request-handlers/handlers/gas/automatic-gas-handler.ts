import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { EIP_7825_TRANSACTION_GAS_CAP } from "../../../../../../../src/internal/builtin-plugins/network-manager/edr/edr-constants.js";
import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import {
  InternalCallOutOfGasError,
  ProviderError,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import {
  AutomaticGasHandler,
  DEFAULT_GAS_MULTIPLIER,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("AutomaticGasHandler", () => {
  function txRequest(id: number = 1) {
    return getJsonRpcRequest(id, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);
  }

  let automaticGasHandler: AutomaticGasHandler;
  let mockedProvider: EthereumMockedProvider;

  const FIXED_GAS_LIMIT = 1231;
  const GAS_MULTIPLIER = 1.337;

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToHexString(FIXED_GAS_LIMIT * 1000),
    });

    mockedProvider.setReturnValue(
      "eth_estimateGas",
      numberToHexString(FIXED_GAS_LIMIT),
    );

    automaticGasHandler = new AutomaticGasHandler(
      mockedProvider,
      GAS_MULTIPLIER,
    );
  });

  it("should estimate gas automatically if not present", async () => {
    const jsonRpcRequest = txRequest();

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER)),
    );
  });

  it("should support different gas multipliers", async () => {
    const GAS_MULTIPLIER2 = 123;

    const jsonRpcRequest = txRequest();

    automaticGasHandler = new AutomaticGasHandler(
      mockedProvider,
      GAS_MULTIPLIER2,
    );

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2)),
    );
  });

  it("should have a default multiplier", async () => {
    const jsonRpcRequest = txRequest();

    automaticGasHandler = new AutomaticGasHandler(mockedProvider);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER)),
    );
  });

  it("shouldn't replace the provided gas", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567,
      },
    ]);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gas, 567);
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = getJsonRpcRequest(1, "eth_randomMethod", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
      },
    ]);

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(tx.gas, undefined);
  });

  describe("when the estimation fails with an internal out-of-gas error", () => {
    // Distinct from the EIP-7825 cap, so these tests can tell a configured
    // fallback apart from the no-fallback default
    const FALLBACK_GAS = 5_000_000n;
    const BLOCK_GAS_LIMIT = 60_000_000;

    beforeEach(() => {
      // A block gas limit above the fallback values, so it doesn't cap them
      mockedProvider.setReturnValue("eth_getBlockByNumber", {
        gasLimit: numberToHexString(BLOCK_GAS_LIMIT),
      });

      mockedProvider.setReturnValue("eth_estimateGas", () => {
        throw new InternalCallOutOfGasError();
      });
    });

    it("should use the fallback gas, without applying the multiplier", async () => {
      const jsonRpcRequest = txRequest();

      automaticGasHandler = new AutomaticGasHandler(
        mockedProvider,
        GAS_MULTIPLIER,
        FALLBACK_GAS,
      );

      await automaticGasHandler.handle(jsonRpcRequest);
      const [tx] = getRequestParams(jsonRpcRequest);

      assert.ok(isObject(tx), "tx is not an object");
      assert.equal(tx.gas, numberToHexString(FALLBACK_GAS));
    });

    it("should cap the fallback gas to the current block gas limit", async () => {
      const LOW_BLOCK_GAS_LIMIT = 1_000_000;

      mockedProvider.setReturnValue("eth_getBlockByNumber", {
        gasLimit: numberToHexString(LOW_BLOCK_GAS_LIMIT),
      });

      const jsonRpcRequest = txRequest();

      automaticGasHandler = new AutomaticGasHandler(
        mockedProvider,
        GAS_MULTIPLIER,
        FALLBACK_GAS,
      );

      await automaticGasHandler.handle(jsonRpcRequest);
      const [tx] = getRequestParams(jsonRpcRequest);

      assert.ok(isObject(tx), "tx is not an object");
      assert.equal(tx.gas, numberToHexString(LOW_BLOCK_GAS_LIMIT));
    });

    it("should not use the cached block gas limit to cap the fallback gas", async () => {
      automaticGasHandler = new AutomaticGasHandler(
        mockedProvider,
        GAS_MULTIPLIER,
        FALLBACK_GAS,
      );

      // Populate the block gas limit cache with a successful estimation
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToHexString(FIXED_GAS_LIMIT),
      );
      await automaticGasHandler.handle(txRequest());

      // Lower the block gas limit (e.g. evm_setBlockGasLimit) and make the
      // estimation fail: the cap must use the current limit, not the cache
      const LOW_BLOCK_GAS_LIMIT = 1_000_000;
      mockedProvider.setReturnValue("eth_getBlockByNumber", {
        gasLimit: numberToHexString(LOW_BLOCK_GAS_LIMIT),
      });
      mockedProvider.setReturnValue("eth_estimateGas", () => {
        throw new InternalCallOutOfGasError();
      });

      const jsonRpcRequest = txRequest(2);

      await automaticGasHandler.handle(jsonRpcRequest);
      const [tx] = getRequestParams(jsonRpcRequest);

      assert.ok(isObject(tx), "tx is not an object");
      assert.equal(tx.gas, numberToHexString(LOW_BLOCK_GAS_LIMIT));
    });

    it("should fall back to the EIP-7825 transaction gas cap if no fallback gas was provided", async () => {
      // e.g. an http connection, where the network's default transaction gas
      // limit is unknown
      const jsonRpcRequest = txRequest();

      await automaticGasHandler.handle(jsonRpcRequest);
      const [tx] = getRequestParams(jsonRpcRequest);

      assert.ok(isObject(tx), "tx is not an object");
      assert.equal(tx.gas, numberToHexString(EIP_7825_TRANSACTION_GAS_CAP));
    });

    it("should detect the error by its data reason, as received over JSON-RPC", async () => {
      // An http connection to a `hardhat node` server receives a plain
      // ProviderError whose data carries the reason discriminator
      mockedProvider.setReturnValue("eth_estimateGas", () => {
        const error = new ProviderError("gas estimation failed", -32000);
        error.data = {
          message: "gas estimation failed",
          reason: "InternalCallOutOfGas",
        };
        throw error;
      });

      const jsonRpcRequest = txRequest();

      await automaticGasHandler.handle(jsonRpcRequest);
      const [tx] = getRequestParams(jsonRpcRequest);

      assert.ok(isObject(tx), "tx is not an object");
      assert.equal(tx.gas, numberToHexString(EIP_7825_TRANSACTION_GAS_CAP));
    });
  });

  it("should still use the block gas limit for other execution errors", async () => {
    mockedProvider.setReturnValue("eth_estimateGas", () => {
      throw new Error("there was an execution error");
    });

    const jsonRpcRequest = txRequest();

    automaticGasHandler = new AutomaticGasHandler(
      mockedProvider,
      GAS_MULTIPLIER,
      // Not used: an ordinary execution error must still get the block gas limit
      5_000_000n,
    );

    await automaticGasHandler.handle(jsonRpcRequest);
    const [tx] = getRequestParams(jsonRpcRequest);

    assert.ok(isObject(tx), "tx is not an object");
    assert.equal(
      tx.gas,
      numberToHexString(Math.floor(FIXED_GAS_LIMIT * 1000 * 0.95)),
    );
  });
});
