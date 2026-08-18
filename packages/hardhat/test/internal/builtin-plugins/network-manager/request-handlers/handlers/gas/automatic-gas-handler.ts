import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { InternalCallOutOfGasError } from "../../../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import {
  AutomaticGasHandler,
  DEFAULT_GAS_MULTIPLIER,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-handler.js";
import { BLOCK_GAS_LIMIT_SAFETY_FACTOR } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/multiplied-gas-estimation.js";
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
    // Below the block gas limit, so the cap doesn't interfere unless a test
    // lowers that limit on purpose
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

    it("should cap the fallback gas to the current block gas limit, not the cached one", async () => {
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

    it("should read the pending block's gas limit, which reflects evm_setBlockGasLimit right away", async () => {
      automaticGasHandler = new AutomaticGasHandler(
        mockedProvider,
        GAS_MULTIPLIER,
        FALLBACK_GAS,
      );

      // A successful estimation reads the latest block, to cap the multiplied
      // estimation
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToHexString(FIXED_GAS_LIMIT),
      );
      await automaticGasHandler.handle(txRequest());

      assert.deepEqual(mockedProvider.getLatestParams("eth_getBlockByNumber"), [
        "latest",
        false,
      ]);

      // The fallback instead reads the pending block: after
      // evm_setBlockGasLimit, the latest block's header still reports the old
      // limit until a block is mined under the new one, so capping with it
      // would leave the transaction unmineable
      mockedProvider.setReturnValue("eth_estimateGas", () => {
        throw new InternalCallOutOfGasError();
      });
      await automaticGasHandler.handle(txRequest(2));

      assert.deepEqual(mockedProvider.getLatestParams("eth_getBlockByNumber"), [
        "pending",
        false,
      ]);
    });

    it("should rethrow if no fallback gas was provided", async () => {
      // e.g. an http connection, where the network's default transaction gas
      // limit is unknown (and serialization reduces the error to a plain
      // ProviderError carrying the reason discriminator in its data).
      // Guessing a limit risks one that doesn't suit the remote network, so
      // the estimation error reaches the user instead: it names both an
      // explicit gas limit and the topLevelSuccess mode.
      const jsonRpcRequest = txRequest();

      await assertRejects(
        automaticGasHandler.handle(jsonRpcRequest),
        (error) => error instanceof InternalCallOutOfGasError,
        "The estimation error should reach the caller",
      );
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
      numberToHexString(
        Math.floor(FIXED_GAS_LIMIT * 1000 * BLOCK_GAS_LIMIT_SAFETY_FACTOR),
      ),
    );
  });
});
