import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../src/internal/core/providers/provider-utils";
import { expectBuidlerError } from "../../../helpers/errors";

describe("Provider utils", function () {
  describe("rpcQuantityToNumber", function () {
    it("Should decode valid quantities", function () {
      assert.equal(rpcQuantityToNumber("0x0"), 0);
      assert.equal(rpcQuantityToNumber("0x1"), 1);
      assert.equal(rpcQuantityToNumber("0x10"), 16);
      assert.equal(rpcQuantityToNumber("0x123"), 291);
    });

    it("Should not accept invalid quantities", function () {
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

  describe("numberToRpcQuantity", function () {
    it("Should encode numbers correctly", function () {
      assert.equal(numberToRpcQuantity(0), "0x0");
      assert.equal(numberToRpcQuantity(1), "0x1");
      assert.equal(numberToRpcQuantity(16), "0x10");
      assert.equal(numberToRpcQuantity(291), "0x123");
    });
  });
});
