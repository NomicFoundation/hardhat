import { assert } from "chai";
import { BN, zeroAddress } from "ethereumjs-util";

import {
  bufferToRpcData,
  numberToRpcQuantity,
  RpcBlockOutput
} from "../../../../../src/internal/buidler-evm/provider/output";
import { rpcQuantityToNumber } from "../../../../../src/internal/core/providers/provider-utils";
import {
  assertInvalidArgumentsError,
  assertLatestBlockNumber
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

  describe("Snapshot functionality", function() {
    describe("evm_snapshot", async function() {
      it("returns the snapshot id starting at 1", async function() {
        const id1: string = await this.provider.send("evm_snapshot", []);
        const id2: string = await this.provider.send("evm_snapshot", []);
        const id3: string = await this.provider.send("evm_snapshot", []);

        assert.equal(id1, "0x1");
        assert.equal(id2, "0x2");
        assert.equal(id3, "0x3");
      });

      it("Doesn't repeat snapshot ids after revert is called", async function() {
        const id1: string = await this.provider.send("evm_snapshot", []);
        const reverted: boolean = await this.provider.send("evm_revert", [id1]);
        const id2: string = await this.provider.send("evm_snapshot", []);

        assert.equal(id1, "0x1");
        assert.isTrue(reverted);
        assert.equal(id2, "0x2");
      });
    });

    describe("evm_revert", async function() {
      it("Returns false for non-existing ids", async function() {
        const reverted1: boolean = await this.provider.send("evm_revert", [
          "0x1"
        ]);
        const reverted2: boolean = await this.provider.send("evm_revert", [
          "0x2"
        ]);
        const reverted3: boolean = await this.provider.send("evm_revert", [
          "0x0"
        ]);

        assert.isFalse(reverted1);
        assert.isFalse(reverted2);
        assert.isFalse(reverted3);
      });

      it("Returns false for already reverted ids", async function() {
        const id1: string = await this.provider.send("evm_snapshot", []);
        const reverted: boolean = await this.provider.send("evm_revert", [id1]);
        const reverted2: boolean = await this.provider.send("evm_revert", [
          id1
        ]);

        assert.isTrue(reverted);
        assert.isFalse(reverted2);
      });

      it("Deletes previous blocks", async function() {
        const snapshotId: string = await this.provider.send("evm_snapshot", []);
        const initialLatestBlock = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );

        await this.provider.send("evm_mine");
        await this.provider.send("evm_mine");
        await this.provider.send("evm_mine");
        await this.provider.send("evm_mine");
        const latestBlockBeforeReverting = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        const newLatestBlock = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );
        assert.equal(newLatestBlock.hash, initialLatestBlock.hash);

        const blockByHash = await this.provider.send("eth_getBlockByHash", [
          bufferToRpcData(latestBlockBeforeReverting.hash),
          false
        ]);
        assert.isNull(blockByHash);

        const blockByNumber = await this.provider.send("eth_getBlockByNumber", [
          latestBlockBeforeReverting.number,
          false
        ]);
        assert.isNull(blockByNumber);
      });

      it("Deletes previous transactions", async function() {
        const [from] = await this.provider.send("eth_accounts");

        const snapshotId: string = await this.provider.send("evm_snapshot", []);

        const txHash = await this.provider.send("eth_sendTransaction", [
          {
            from,
            to: "0x1111111111111111111111111111111111111111",
            value: numberToRpcQuantity(1),
            gas: numberToRpcQuantity(100000),
            gasPrice: numberToRpcQuantity(1),
            nonce: numberToRpcQuantity(0)
          }
        ]);

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        const txHashAfter = await this.provider.send(
          "eth_getTransactionByHash",
          [txHash]
        );
        assert.isNull(txHashAfter);
      });

      it("Allows resending the same tx after a revert", async function() {
        const [from] = await this.provider.send("eth_accounts");

        const snapshotId: string = await this.provider.send("evm_snapshot", []);

        const txParams = {
          from,
          to: "0x1111111111111111111111111111111111111111",
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(100000),
          gasPrice: numberToRpcQuantity(1),
          nonce: numberToRpcQuantity(0)
        };

        const txHash = await this.provider.send("eth_sendTransaction", [
          txParams
        ]);

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        const txHash2 = await this.provider.send("eth_sendTransaction", [
          txParams
        ]);

        assert.equal(txHash2, txHash);
      });

      it("Deletes the used snapshot and the following ones", async function() {
        const snapshotId1: string = await this.provider.send(
          "evm_snapshot",
          []
        );
        const snapshotId2: string = await this.provider.send(
          "evm_snapshot",
          []
        );
        const snapshotId3: string = await this.provider.send(
          "evm_snapshot",
          []
        );

        const revertedTo2: boolean = await this.provider.send("evm_revert", [
          snapshotId2
        ]);
        assert.isTrue(revertedTo2);

        const revertedTo3: boolean = await this.provider.send("evm_revert", [
          snapshotId3
        ]);
        // snapshot 3 didn't exist anymore
        assert.isFalse(revertedTo3);

        const revertedTo1: boolean = await this.provider.send("evm_revert", [
          snapshotId1
        ]);
        // snapshot 1 still existed
        assert.isTrue(revertedTo1);
      });

      it("Resets the blockchain so that new blocks are added with the right numbers", async function() {
        await this.provider.send("evm_mine");
        await this.provider.send("evm_mine");

        await assertLatestBlockNumber(this.provider, 2);

        const snapshotId1: string = await this.provider.send(
          "evm_snapshot",
          []
        );

        await this.provider.send("evm_mine");

        await assertLatestBlockNumber(this.provider, 3);

        const revertedTo1: boolean = await this.provider.send("evm_revert", [
          snapshotId1
        ]);
        assert.isTrue(revertedTo1);

        await assertLatestBlockNumber(this.provider, 2);

        await this.provider.send("evm_mine");

        await assertLatestBlockNumber(this.provider, 3);

        await this.provider.send("evm_mine");

        const snapshotId2: string = await this.provider.send(
          "evm_snapshot",
          []
        );

        await this.provider.send("evm_mine");

        const snapshotId3: string = await this.provider.send(
          "evm_snapshot",
          []
        );

        await this.provider.send("evm_mine");

        await assertLatestBlockNumber(this.provider, 6);

        const revertedTo2: boolean = await this.provider.send("evm_revert", [
          snapshotId2
        ]);
        assert.isTrue(revertedTo2);

        await assertLatestBlockNumber(this.provider, 4);
      });

      it("Resets the date to the right time", async function() {
        // First, we increase the time by 100 sec
        await this.provider.send("evm_increaseTime", [100]);
        const startDate = new Date();
        await this.provider.send("evm_mine");
        const snapshotId: string = await this.provider.send("evm_snapshot", []);

        const snapshotedBlock = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );

        assert.equal(
          snapshotedBlock.timestamp,
          numberToRpcQuantity(Math.ceil(startDate.valueOf() / 1000) + 100)
        );

        // TODO: Somehow test this without a sleep
        await new Promise(resolve => setTimeout(resolve, 2000));

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        await this.provider.send("evm_mine");
        const afterRevertBlock = await this.provider.send(
          "eth_getBlockByNumber",
          ["latest", false]
        );

        assert.equal(
          afterRevertBlock.timestamp,
          numberToRpcQuantity(
            rpcQuantityToNumber(snapshotedBlock.timestamp) + 1
          )
        );
      });

      it("Restores the previous state", async function() {
        // This is a very coarse test, as we know that the entire state is
        // managed by the vm, and is restored as a whole
        const [from] = await this.provider.send("eth_accounts");

        const balanceBeforeTx = await this.provider.send("eth_getBalance", [
          from
        ]);

        const snapshotId: string = await this.provider.send("evm_snapshot", []);

        const txParams = {
          from,
          to: "0x1111111111111111111111111111111111111111",
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(100000),
          gasPrice: numberToRpcQuantity(1),
          nonce: numberToRpcQuantity(0)
        };

        await this.provider.send("eth_sendTransaction", [txParams]);

        const balanceAfterTx = await this.provider.send("eth_getBalance", [
          from
        ]);

        assert.notEqual(balanceAfterTx, balanceBeforeTx);

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        const balanceAfterRevert = await this.provider.send("eth_getBalance", [
          from
        ]);

        assert.equal(balanceAfterRevert, balanceBeforeTx);
      });

      it("Should restore block filters", async function() {
        await this.provider.send("evm_mine", []);

        const firstId = await this.provider.send("eth_newBlockFilter", []);
        assert.equal(firstId, "0x1");

        const firstFilterInitialChanges = await this.provider.send(
          "eth_getFilterChanges",
          [firstId]
        );

        assert.lengthOf(firstFilterInitialChanges, 1);

        await this.provider.send("evm_mine", []);

        const snapshotId: string = await this.provider.send("evm_snapshot", []);

        await this.provider.send("evm_mine", []);

        const secondId = await this.provider.send("eth_newBlockFilter", []);
        assert.equal(secondId, "0x2");

        const firstFilterSecondChanges = await this.provider.send(
          "eth_getFilterChanges",
          [firstId]
        );
        assert.lengthOf(firstFilterSecondChanges, 2);

        const reverted: boolean = await this.provider.send("evm_revert", [
          snapshotId
        ]);
        assert.isTrue(reverted);

        const secondIdAfterRevert = await this.provider.send(
          "eth_newBlockFilter",
          []
        );
        assert.equal(secondIdAfterRevert, "0x2");

        const firstFilterSecondChangesAfterRevert = await this.provider.send(
          "eth_getFilterChanges",
          [firstId]
        );
        assert.lengthOf(firstFilterSecondChangesAfterRevert, 1);
        assert.equal(
          firstFilterSecondChangesAfterRevert[0],
          firstFilterSecondChanges[0]
        );
      });
    });
  });
});
