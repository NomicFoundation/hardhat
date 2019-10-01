import { assert } from "chai";
import { zeroAddress } from "ethereumjs-util";

import {
  numberToRpcQuantity,
  RpcBlockOutput
} from "../../../../../src/internal/buidler-evm/provider/output";
import {
  assertInvalidArgumentsError,
  assertNotSupported
} from "../../helpers/assertions";
import { quantityToNumber } from "../../helpers/conversions";
import { setCWD } from "../../helpers/cwd";
import { useProvider } from "../../helpers/useProvider";

describe("Evm module", function() {
  setCWD();
  useProvider();

  describe("evm_increaseTime", async function() {
    it("should increase the offset of time used for block timestamps", async function() {
      const accounts = await this.provider.send("eth_accounts");
      const burnTxParams = {
        from: accounts[0],
        to: zeroAddress(),
        value: numberToRpcQuantity(1),
        gas: numberToRpcQuantity(21000),
        gasPrice: numberToRpcQuantity(1)
      };

      const firstBlock = await this.provider.send("eth_getBlockByNumber", [
        numberToRpcQuantity(0),
        false
      ]);

      await this.provider.send("evm_increaseTime", [123]);

      await this.provider.send("eth_sendTransaction", [burnTxParams]);

      const secondBlock = await this.provider.send("eth_getBlockByNumber", [
        numberToRpcQuantity(1),
        false
      ]);

      await this.provider.send("evm_increaseTime", [456]);

      await this.provider.send("eth_sendTransaction", [burnTxParams]);

      const thirdBlock = await this.provider.send("eth_getBlockByNumber", [
        numberToRpcQuantity(2),
        false
      ]);

      const firstTimestamp = quantityToNumber(firstBlock.timestamp);
      const secondTimestamp = quantityToNumber(secondBlock.timestamp);
      const thirdTimestamp = quantityToNumber(thirdBlock.timestamp);

      assert.isAtLeast(secondTimestamp - firstTimestamp, 123);
      assert.isAtLeast(thirdTimestamp - secondTimestamp, 456);
    });

    it("should return the total offset as a decimal string, not a QUANTITY", async function() {
      let totalOffset = await this.provider.send("evm_increaseTime", [123]);
      assert.isString(totalOffset);
      assert.strictEqual(parseInt(totalOffset, 10), 123);

      totalOffset = await this.provider.send("evm_increaseTime", [3456789]);
      assert.isString(totalOffset);
      assert.strictEqual(parseInt(totalOffset, 10), 123 + 3456789);
    });

    it("should expect an actual number as its first param, not a hex string", async function() {
      await assertInvalidArgumentsError(this.provider, "evm_increaseTime", [
        numberToRpcQuantity(123)
      ]);
    });
  });

  describe("evm_mine", async function() {
    it("should mine an empty block", async function() {
      await this.provider.send("evm_mine");

      const block: RpcBlockOutput = await this.provider.send(
        "eth_getBlockByNumber",
        [numberToRpcQuantity(1), false]
      );

      assert.isEmpty(block.transactions);

      await this.provider.send("evm_mine");

      const block2: RpcBlockOutput = await this.provider.send(
        "eth_getBlockByNumber",
        [numberToRpcQuantity(2), false]
      );

      assert.isEmpty(block2.transactions);
    });
  });

  describe("evm_revert", async function() {
    it("is not supported", async function() {
      await assertNotSupported(this.provider, "evm_revert");
    });
  });

  describe("evm_snapshot", async function() {
    it("is not supported", async function() {
      await assertNotSupported(this.provider, "evm_snapshot");
    });
  });
});
