import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  createChainIdGetter,
  numberToRpcQuantity,
  rpcQuantityToNumber
} from "../../../../src/internal/core/providers/provider-utils";
import { expectBuidlerError } from "../../../helpers/errors";

import { MockedProvider } from "./mocks";

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
      const mockedProvider = new MockedProvider();
      mockedProvider.setReturnValue("eth_chainId", numberToRpcQuantity(1));
      mockedProvider.setReturnValue("net_version", "2");

      const chainIdGetter = createChainIdGetter(mockedProvider);

      assert.equal(mockedProvider.getTotalNumberOfCalls(), 0);
      await chainIdGetter();
      assert.equal(mockedProvider.getTotalNumberOfCalls(), 1);
      await chainIdGetter();
      assert.equal(mockedProvider.getTotalNumberOfCalls(), 1);
      await chainIdGetter();
      assert.equal(mockedProvider.getTotalNumberOfCalls(), 1);

      const mockedProvider2 = new MockedProvider();
      mockedProvider2.setReturnValue("net_version", "2");
      const netVersionGetter = createChainIdGetter(mockedProvider2);

      assert.equal(mockedProvider2.getTotalNumberOfCalls(), 0);
      await netVersionGetter();

      // First eth_chainId is called, then net_version, hence 2
      assert.equal(mockedProvider2.getTotalNumberOfCalls(), 2);
      await netVersionGetter();
      assert.equal(mockedProvider2.getTotalNumberOfCalls(), 2);
      await netVersionGetter();
      assert.equal(mockedProvider2.getTotalNumberOfCalls(), 2);
    });

    it("Should use eth_chainId if supported", async function() {
      const mockedProvider = new MockedProvider();
      mockedProvider.setReturnValue("eth_chainId", numberToRpcQuantity(1));
      mockedProvider.setReturnValue("net_version", "2");

      const chainIdGetter = createChainIdGetter(mockedProvider);

      assert.equal(await chainIdGetter(), 1);
    });

    it("Should use net_version if eth_chainId is not supported", async function() {
      const mockedProvider = new MockedProvider();
      mockedProvider.setReturnValue("net_version", "2");
      const netVersionGetter = createChainIdGetter(mockedProvider);

      assert.equal(await netVersionGetter(), 2);
    });

    it("Should throw if both eth_chainId and net_version fail", async function() {
      const mockedProvider = new MockedProvider();
      mockedProvider.setReturnValue("eth_chainId", () => {
        throw new Error("Unsupported method");
      });
      mockedProvider.setReturnValue("net_version", () => {
        throw new Error("Unsupported method");
      });

      const failingGetter = createChainIdGetter(mockedProvider);

      try {
        await failingGetter();
      } catch (error) {
        return;
      }

      assert.fail("Expected exception not thrown");
    });
  });
});
