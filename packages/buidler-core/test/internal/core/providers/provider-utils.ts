import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors";
import {
  createChainIdGetter,
  numberToRpcQuantity,
  rpcQuantityToNumber
} from "../../../../src/internal/core/providers/provider-utils";
import { expectBuidlerError } from "../../../helpers/errors";

import { ChainIdMockProvider } from "./mocks";

describe("Provider utils", function() {
  describe("rpcQuantityToNumber", function() {
    it("Should decode valid quantities", function() {
      assert.equal(rpcQuantityToNumber("0x0"), 0);
      assert.equal(rpcQuantityToNumber("0x1"), 1);
      assert.equal(rpcQuantityToNumber("0x10"), 16);
      assert.equal(rpcQuantityToNumber("0x123"), 291);
    });

    it("Should not accept invalid quantities", function() {
      expectBuidlerError(
        () => rpcQuantityToNumber("0x"),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );

      expectBuidlerError(
        () => rpcQuantityToNumber("0X1"),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );

      expectBuidlerError(
        () => rpcQuantityToNumber(""),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );

      expectBuidlerError(
        () => rpcQuantityToNumber("0x01"),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );

      expectBuidlerError(
        () => rpcQuantityToNumber("0xp"),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );

      expectBuidlerError(
        () => rpcQuantityToNumber("ff"),
        ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE
      );
    });
  });

  describe("numberToRpcQuantity", function() {
    it("Should encode numbers correctly", function() {
      assert.equal(numberToRpcQuantity(0), "0x0");
      assert.equal(numberToRpcQuantity(1), "0x1");
      assert.equal(numberToRpcQuantity(16), "0x10");
      assert.equal(numberToRpcQuantity(291), "0x123");
    });
  });

  describe("createChainIdGetter", function() {
    it("Should call the provider only once", async function() {
      const chainIdProvider = new ChainIdMockProvider(1, 2);
      const chainIdGetter = createChainIdGetter(chainIdProvider);

      assert.equal(chainIdProvider.numberOfCalls, 0);
      await chainIdGetter();
      assert.equal(chainIdProvider.numberOfCalls, 1);
      await chainIdGetter();
      assert.equal(chainIdProvider.numberOfCalls, 1);
      await chainIdGetter();
      assert.equal(chainIdProvider.numberOfCalls, 1);

      const netVersionProvider = new ChainIdMockProvider(undefined, 2);
      const netVersionGetter = createChainIdGetter(netVersionProvider);

      assert.equal(netVersionProvider.numberOfCalls, 0);
      await netVersionGetter();

      // First eth_chainId is called, then net_version, hence 2
      assert.equal(netVersionProvider.numberOfCalls, 2);
      await netVersionGetter();
      assert.equal(netVersionProvider.numberOfCalls, 2);
      await netVersionGetter();
      assert.equal(netVersionProvider.numberOfCalls, 2);
    });

    it("Should use eth_chainId if supported", async function() {
      const chainIdProvider = new ChainIdMockProvider(1, 2);
      const chainIdGetter = createChainIdGetter(chainIdProvider);

      assert.equal(await chainIdGetter(), 1);
    });

    it("Should use net_version if eth_chainId is not supported", async function() {
      const netVersionProvider = new ChainIdMockProvider(undefined, 2);
      const netVersionGetter = createChainIdGetter(netVersionProvider);

      assert.equal(await netVersionGetter(), 2);
    });

    it("Should throw if both eth_chainId and net_version fail", async function() {
      const failingProvider = new ChainIdMockProvider(undefined, undefined);
      const failingGetter = createChainIdGetter(failingProvider);

      try {
        await failingGetter();
      } catch (error) {
        return;
      }

      assert.fail("Expected exception not thrown");
    });
  });
});
