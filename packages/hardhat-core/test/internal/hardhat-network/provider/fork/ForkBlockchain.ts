import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  bufferToBigInt,
  bufferToHex,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { JsonRpcClient } from "../../../../../src/internal/hardhat-network/jsonrpc/client";
import { ForkBlockchain } from "../../../../../src/internal/hardhat-network/provider/fork/ForkBlockchain";
import { randomHashBuffer } from "../../../../../src/internal/hardhat-network/provider/utils/random";
import {
  makeForkClient,
  getLastSafeBlock,
} from "../../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { ALCHEMY_URL } from "../../../../setup";
import {
  createTestLog,
  createTestReceipt,
  createTestTransaction,
} from "../../helpers/blockchain";
import {
  BLOCK_HASH_OF_10496585,
  BLOCK_NUMBER_OF_10496585,
  FIRST_TX_HASH_OF_10496585,
  LAST_TX_HASH_OF_10496585,
  TOTAL_DIFFICULTY_OF_BLOCK_10496585,
} from "../../helpers/constants";

describe("ForkBlockchain", () => {
  let client: JsonRpcClient;
  let forkBlockNumber: bigint;
  let common: Common;
  let fb: ForkBlockchain;

  function createBlock(parent: Block, difficulty: bigint = 0n) {
    return Block.fromBlockData(
      {
        header: {
          number: parent.header.number + 1n,
          parentHash: parent.hash(),
          difficulty,
        },
      },
      { common, skipConsensusFormatValidation: true }
    );
  }

  before(async function () {
    if (ALCHEMY_URL === undefined) {
      this.skip();
      return;
    }
  });

  beforeEach(async () => {
    const clientResult = await makeForkClient({ jsonRpcUrl: ALCHEMY_URL! });
    client = clientResult.forkClient;
    forkBlockNumber = clientResult.forkBlockNumber;

    common = new Common({ chain: "mainnet" });
    common.setHardfork(common.getHardforkByBlockNumber(forkBlockNumber));

    fb = new ForkBlockchain(client, forkBlockNumber, common);
  });

  it("can be constructed", () => {
    assert.instanceOf(fb, ForkBlockchain);
  });

  describe("getLastSafeBlock", () => {
    it("should return a safe block that is the difference between the latestBlock and maxReorg", () => {
      assert.strictEqual(getLastSafeBlock(100n, 50n), 50n);
      assert.strictEqual(getLastSafeBlock(100n, 100n), 0n); // 0 is a valid fork block number
    });

    it("should return latestBlock as fork block because the difference between the latestBlock and maxReorg is < 0", () => {
      assert.strictEqual(getLastSafeBlock(20n, 200n), 20n);
    });
  });

  describe("getBlock", () => {
    it("can get remote block object by block number", async () => {
      const block = await fb.getBlock(BLOCK_NUMBER_OF_10496585);

      assert.isTrue(block?.hash().equals(BLOCK_HASH_OF_10496585));
      assert.equal(block?.transactions.length, 192);
      assert.isTrue(
        block?.transactions[0].hash().equals(FIRST_TX_HASH_OF_10496585)
      );
      assert.isTrue(
        block?.transactions[191].hash().equals(LAST_TX_HASH_OF_10496585)
      );
    });

    it("can get remote block object by hash", async () => {
      const block = await fb.getBlock(BLOCK_HASH_OF_10496585);

      assert.isTrue(block?.hash().equals(BLOCK_HASH_OF_10496585));
      assert.equal(block?.transactions.length, 192);
      assert.isTrue(
        block?.transactions[0].hash().equals(FIRST_TX_HASH_OF_10496585)
      );
      assert.isTrue(
        block?.transactions[191].hash().equals(LAST_TX_HASH_OF_10496585)
      );
    });

    it("caches the block object and returns the same one for subsequent calls", async () => {
      const blockOne = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      const blockTwo = await fb.getBlock(BLOCK_HASH_OF_10496585);
      const blockThree = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      const blockFour = await fb.getBlock(BLOCK_HASH_OF_10496585);
      assert.equal(blockOne, blockTwo);
      assert.equal(blockTwo, blockThree);
      assert.equal(blockThree, blockFour);
    });

    it("throws for non-existent block", async () => {
      await assert.isRejected(
        fb.getBlock(randomHashBuffer()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(forkBlockNumber + 100n),
        Error,
        "Block not found"
      );
    });

    it("can get remote block object with create transaction", async () => {
      const daiCreationBlock = 4719568n;
      const daiCreateTxPosition = 85;
      const block = await fb.getBlock(daiCreationBlock);
      assert.isTrue(block?.transactions[daiCreateTxPosition].to === undefined);
      assert.isTrue(
        block?.transactions[daiCreateTxPosition]
          .hash()
          .equals(
            toBuffer(
              "0xb95343413e459a0f97461812111254163ae53467855c0d73e0f1e7c5b8442fa3"
            )
          )
      );
    });

    it("cannot get remote blocks that are newer than forkBlockNumber", async () => {
      fb = new ForkBlockchain(client, forkBlockNumber - 10n, common);
      const newerBlock = await client.getBlockByNumber(forkBlockNumber - 5n);

      await assert.isRejected(
        fb.getBlock(newerBlock!.hash!),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(newerBlock!.hash!),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(forkBlockNumber - 5n),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(forkBlockNumber - 5n),
        Error,
        "Block not found"
      );
    });

    it("can retrieve inserted block by hash", async () => {
      const block = createBlock(await fb.getLatestBlock());
      await fb.addBlock(block);
      const savedBlock = await fb.getBlock(block.hash());
      assert.equal(savedBlock, block);
    });
  });

  describe("getLatestBlock", () => {
    it("returns the block at which we fork if no blocks were added", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585, common);
      const block = await fb.getLatestBlock();

      assert.isTrue(block?.hash().equals(BLOCK_HASH_OF_10496585));
      assert.equal(block?.transactions.length, 192);
      assert.isTrue(
        block?.transactions[0].hash().equals(FIRST_TX_HASH_OF_10496585)
      );
      assert.isTrue(
        block?.transactions[191].hash().equals(LAST_TX_HASH_OF_10496585)
      );
    });

    it("returns the latest added block", async () => {
      const block = createBlock(await fb.getLatestBlock());
      await fb.addBlock(block);
      const latestBlock = await fb.getLatestBlock();
      assert.equal(latestBlock, block);
    });
  });

  describe("putBlock", () => {
    it("can save a new block in the blockchain", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const returnedBlock = await fb.addBlock(block);
      const savedBlock = await fb.getBlock(forkBlockNumber + 1n);
      assert.equal(returnedBlock, block);
      assert.equal(savedBlock, block);
    });

    it("rejects blocks with invalid block number", async () => {
      await assert.isRejected(
        fb.addBlock(
          Block.fromBlockData({ header: { number: forkBlockNumber + 2n } })
        ),
        Error,
        "Invalid block number"
      );
    });

    it("rejects blocks with invalid parent hash after the first block in the forked blockchain", async () => {
      const block = createBlock(await fb.getLatestBlock());
      await fb.addBlock(block);

      await assert.isRejected(
        fb.addBlock(
          Block.fromBlockData({ header: { number: forkBlockNumber + 2n } })
        ),
        Error,
        "Invalid parent hash"
      );
    });

    it("can save more than one block", async () => {
      const blockOne = createBlock(await fb.getLatestBlock());
      const blockTwo = createBlock(blockOne);
      const blockThree = createBlock(blockTwo);

      await fb.addBlock(blockOne);
      await fb.addBlock(blockTwo);
      await fb.addBlock(blockThree);

      assert.equal(await fb.getBlock(forkBlockNumber + 1n), blockOne);
      assert.equal(await fb.getBlock(forkBlockNumber + 2n), blockTwo);
      assert.equal(await fb.getBlock(forkBlockNumber + 3n), blockThree);
    });
  });

  describe("delBlock", () => {
    it("removes the block and all subsequent ones", async () => {
      const blockOne = createBlock(await fb.getLatestBlock());
      const blockTwo = createBlock(blockOne);
      const blockThree = createBlock(blockTwo);

      await fb.addBlock(blockOne);
      await fb.addBlock(blockTwo);
      await fb.addBlock(blockThree);

      fb.deleteBlock(blockOne.hash());

      await assert.isRejected(
        fb.getBlock(blockOne.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("updates the latest block number", async () => {
      const blockOne = createBlock(await fb.getLatestBlock());
      const blockTwo = createBlock(blockOne);
      const blockThree = createBlock(blockTwo);

      await fb.addBlock(blockOne);
      await fb.addBlock(blockTwo);
      fb.deleteBlock(blockTwo.hash());

      assert.equal(await fb.getLatestBlock(), blockOne);
      await assert.isRejected(
        fb.addBlock(blockThree),
        Error,
        "Invalid block number"
      );
    });

    it("is possible to add a block after delete", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const otherBlock = createBlock(
        await fb.getLatestBlock(),
        bufferToBigInt(randomHashBuffer())
      );
      await fb.addBlock(block);
      fb.deleteBlock(block.hash());
      await fb.addBlock(otherBlock);
      assert.equal(await fb.getBlock(otherBlock.hash()), otherBlock);
    });

    it("throws when hash of non-existent block is given", async () => {
      assert.throws(
        () => fb.deleteBlock(Block.fromBlockData().hash()),
        Error,
        "Block not found"
      );
    });

    it("throws when hash of not previously fetched remote block is given", async () => {
      // This is here because we do not want to fetch remote blocks for this operation
      assert.throws(
        () => fb.deleteBlock(BLOCK_HASH_OF_10496585),
        Error,
        "Block not found"
      );
    });

    it("throws on attempt to remove remote block", async () => {
      const remoteBlock = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      assert.throws(
        () => fb.deleteBlock(remoteBlock!.hash()),
        Error,
        "Cannot delete remote block"
      );
    });

    it("throws on attempt to remove the block from which we fork", async () => {
      const forkBlock = await fb.getLatestBlock();
      assert.throws(
        () => fb.deleteBlock(forkBlock.hash()),
        Error,
        "Cannot delete remote block"
      );
    });
  });

  describe("deleteAllFollowingBlocks", () => {
    it("removes all blocks subsequent to the given block", async () => {
      const blockOne = await fb.getLatestBlock();
      const blockTwo = createBlock(blockOne);
      const blockThree = createBlock(blockTwo);

      await fb.addBlock(blockTwo);
      await fb.addBlock(blockThree);

      fb.deleteLaterBlocks(blockOne);

      assert.equal(await fb.getBlock(blockOne.hash()), blockOne);
      await assert.isRejected(
        fb.getBlock(blockTwo.hash()),
        Error,
        "Block not found"
      );
      await assert.isRejected(
        fb.getBlock(blockThree.hash()),
        Error,
        "Block not found"
      );
    });

    it("throws if given block is not present in blockchain", async () => {
      const blockOne = createBlock(await fb.getLatestBlock());
      const notAddedBlock = createBlock(blockOne);
      const fakeBlockOne = createBlock(
        await fb.getLatestBlock(),
        bufferToBigInt(randomHashBuffer())
      );

      await fb.addBlock(blockOne);

      assert.throws(
        () => fb.deleteLaterBlocks(notAddedBlock),
        Error,
        "Invalid block"
      );
      assert.throws(
        () => fb.deleteLaterBlocks(fakeBlockOne),
        Error,
        "Invalid block"
      );
    });

    it("does not throw if there are no following blocks", async () => {
      const blockOne = createBlock(await fb.getLatestBlock());
      await fb.addBlock(blockOne);
      assert.doesNotThrow(() => fb.deleteLaterBlocks(blockOne));
    });

    it("throws on attempt to remove remote blocks", async () => {
      const block = await fb.getBlock(BLOCK_NUMBER_OF_10496585);
      assert.throws(
        () => fb.deleteLaterBlocks(block!),
        Error,
        "Cannot delete remote block"
      );
    });
  });

  describe("getBlockTotalDifficulty", () => {
    it("rejects when hash of non-existent block is given", async () => {
      await assert.isRejected(
        fb.getTotalDifficulty(randomHashBuffer()),
        Error,
        "Block not found"
      );
    });

    it("can get difficulty of the genesis block", async () => {
      const genesis = await client.getBlockByNumber(0n, false);
      const difficulty = await fb.getTotalDifficulty(genesis?.hash!);
      assert.equal(difficulty, genesis?.difficulty);
    });

    it("does not return total difficulty of a deleted block", async () => {
      const block = createBlock(await fb.getLatestBlock());
      await fb.addBlock(block);
      fb.deleteBlock(block.hash());

      await assert.isRejected(
        fb.getTotalDifficulty(block.hash()),
        Error,
        "Block not found"
      );
    });

    it("can get total difficulty of a remote block", async () => {
      const td = await fb.getTotalDifficulty(BLOCK_HASH_OF_10496585);

      assert.equal(
        td.toString(),
        TOTAL_DIFFICULTY_OF_BLOCK_10496585.toString()
      );
    });

    it("can get total difficulty of a new block", async () => {
      const latest = await fb.getLatestBlock();
      const block = createBlock(latest, 1000n);

      const latestDifficulty = await fb.getTotalDifficulty(latest.hash());

      await fb.addBlock(block);

      const totalDifficulty = await fb.getTotalDifficulty(block.hash());

      assert.equal(totalDifficulty, latestDifficulty + 1000n);
    });
  });

  function hasCommonGetTransactionBehaviour(
    getTransaction: typeof fb.getTransaction | typeof fb.getLocalTransaction
  ) {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.isUndefined(await getTransaction(transaction.hash()));
    });

    it("returns a known transaction", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await fb.addBlock(block);

      const result = await getTransaction(transaction.hash());
      assert.equal(result, transaction);
    });

    it("forgets transactions after block is removed", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await fb.addBlock(block);
      fb.deleteBlock(block.hash());

      assert.isUndefined(await getTransaction(transaction.hash()));
    });
  }

  describe("getTransaction", () => {
    hasCommonGetTransactionBehaviour((hash) => fb.getTransaction(hash));

    it("returns a known remote transaction", async () => {
      const result = await fb.getTransaction(FIRST_TX_HASH_OF_10496585);
      assert.isTrue(result?.hash().equals(FIRST_TX_HASH_OF_10496585));
    });

    it("returns undefined for newer remote transactions", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585 - 1n, common);
      assert.equal(
        await fb.getTransaction(FIRST_TX_HASH_OF_10496585),
        undefined
      );
    });
  });

  describe("getLocalTransaction", () => {
    hasCommonGetTransactionBehaviour((hash) => fb.getLocalTransaction(hash));

    it("returns undefined for a remote transaction", async () => {
      const result = fb.getLocalTransaction(FIRST_TX_HASH_OF_10496585);
      assert.isUndefined(result);
    });
  });

  describe("getBlockByTransactionHash", () => {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.equal(
        await fb.getBlockByTransactionHash(transaction.hash()),
        undefined
      );
    });

    it("returns block for a known transaction", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await fb.addBlock(block);

      const result = await fb.getBlockByTransactionHash(transaction.hash());
      assert.equal(result, block);
    });

    it("returns a block for known remote transaction", async () => {
      const result = await fb.getBlockByTransactionHash(
        FIRST_TX_HASH_OF_10496585
      );
      const block = await fb.getBlock(BLOCK_HASH_OF_10496585);
      assert.equal(result, block);
    });

    it("throws for newer remote transactions", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585 - 1n, common);
      await assert.isRejected(
        fb.getBlockByTransactionHash(FIRST_TX_HASH_OF_10496585),
        Error,
        "Block not found"
      );
    });

    it("forgets transactions after block is removed", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await fb.addBlock(block);
      fb.deleteBlock(block.hash());

      assert.equal(
        await fb.getBlockByTransactionHash(transaction.hash()),
        undefined
      );
    });
  });

  describe("getTransactionReceipt", () => {
    it("returns undefined for unknown transactions", async () => {
      const transaction = createTestTransaction();
      assert.equal(
        await fb.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });

    it("returns undefined for a known transaction without receipt", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      block.transactions.push(transaction);
      await fb.addBlock(block);

      assert.equal(
        await fb.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });

    it("returns the receipt when it was provided earlier", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      const receipt = createTestReceipt(transaction);
      block.transactions.push(transaction);

      await fb.addBlock(block);
      fb.addTransactionReceipts([receipt]);

      assert.equal(await fb.getTransactionReceipt(transaction.hash()), receipt);
    });

    it("returns remote receipts", async () => {
      const receipt = await fb.getTransactionReceipt(FIRST_TX_HASH_OF_10496585);
      assert.equal(
        receipt?.transactionHash,
        bufferToHex(FIRST_TX_HASH_OF_10496585)
      );
    });

    it("returns undefined for newer remote receipts", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585 - 1n, common);

      assert.equal(
        await fb.getTransactionReceipt(FIRST_TX_HASH_OF_10496585),
        undefined
      );
    });

    it("forgets receipts after block is removed", async () => {
      const block = createBlock(await fb.getLatestBlock());
      const transaction = createTestTransaction();
      const receipt = createTestReceipt(transaction);
      block.transactions.push(transaction);

      await fb.addBlock(block);
      fb.addTransactionReceipts([receipt]);
      fb.deleteBlock(block.hash());

      assert.equal(
        await fb.getTransactionReceipt(transaction.hash()),
        undefined
      );
    });
  });

  describe("getLogs", () => {
    it("works like BlockchainData.getLogs for new blocks", async () => {
      const block1 = createBlock(await fb.getLatestBlock());
      const number = block1.header.number;
      const log1 = createTestLog(number);
      const log2 = createTestLog(number);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(number);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(block1);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(number + 1n);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      await fb.addBlock(block1);
      await fb.addBlock(block2);
      fb.addTransactionReceipts([receipt1, receipt2, receipt3]);

      const logs = await fb.getLogs({
        fromBlock: number,
        toBlock: number,
        addresses: [],
        normalizedTopics: [],
      });
      assert.deepEqual(logs, [log1, log2, log3]);
    });

    it("supports remote blocks", async () => {
      // See results at https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=10496585&toBlock=10496585&address=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
      const logs = await fb.getLogs({
        fromBlock: BLOCK_NUMBER_OF_10496585,
        toBlock: BLOCK_NUMBER_OF_10496585,
        addresses: [toBuffer("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")],
        normalizedTopics: [],
      });
      assert.equal(logs.length, 12);
      assert.deepEqual(
        logs.map((l) => l.logIndex),
        [
          "0x1",
          "0x4",
          "0xd",
          "0xe",
          "0x11",
          "0x14",
          "0x1b",
          "0x1e",
          "0x29",
          "0x2a",
          "0x8b",
          "0x8c",
        ]
      );
    });

    it("can fetch both remote and local logs simultaneously", async () => {
      fb = new ForkBlockchain(client, BLOCK_NUMBER_OF_10496585, common);

      const block1 = createBlock(await fb.getLatestBlock());
      const number = block1.header.number;
      const log1 = createTestLog(number);
      const log2 = createTestLog(number);
      const tx1 = createTestTransaction();
      const receipt1 = createTestReceipt(tx1, [log1, log2]);
      const tx2 = createTestTransaction();
      const log3 = createTestLog(number);
      const receipt2 = createTestReceipt(tx2, [log3]);
      block1.transactions.push(tx1, tx2);

      const block2 = createBlock(block1);
      const tx3 = createTestTransaction();
      const log4 = createTestLog(number + 1n);
      const receipt3 = createTestReceipt(tx3, [log4]);
      block2.transactions.push(tx3);

      await fb.addBlock(block1);
      await fb.addBlock(block2);
      fb.addTransactionReceipts([receipt1, receipt2, receipt3]);

      const logs = await fb.getLogs({
        fromBlock: BLOCK_NUMBER_OF_10496585,
        toBlock: BLOCK_NUMBER_OF_10496585 + 1n,
        addresses: [],
        normalizedTopics: [],
      });
      assert.equal(logs.length, 208);
    });
  });
});
