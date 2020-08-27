import { assert } from "chai";
import { BN, bufferToHex, setLength, toBuffer } from "ethereumjs-util";

import {
  bufferToRpcData,
  numberToRpcQuantity,
} from "../../../../src/internal/buidler-evm/provider/output";
import { ForkConfig } from "../../../../src/types";
import { assertNodeBalances, assertQuantity } from "../helpers/assertions";
import {
  BITFINEX_WALLET_ADDRESS,
  BLOCK_NUMBER_OF_10496585,
  DAI_ADDRESS,
  FIRST_TX_HASH_OF_10496585,
  INFURA_URL,
  WETH_ADDRESS,
} from "../helpers/constants";
import { dataToBN, quantityToBN } from "../helpers/conversions";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_ACCOUNTS_BALANCES,
} from "../helpers/providers";
import { useProvider } from "../helpers/useProvider";

const FORK_CONFIG: ForkConfig = { jsonRpcUrl: INFURA_URL };
const WETH_DEPOSIT_SELECTOR = "0xd0e30db0";

describe("Forked provider", () => {
  useProvider(false, FORK_CONFIG);
  setCWD();

  it("knows the fork config", function () {
    const config = (this.provider as any)._forkConfig;
    assert.deepEqual(config, FORK_CONFIG);
  });

  it("can get the current block number", async function () {
    const blockNumber = await this.provider.send("eth_blockNumber");
    const minBlockNumber = 10494745; // mainnet block number at 20.07.20
    assert.isAtLeast(parseInt(blockNumber, 16), minBlockNumber);
  });

  describe("eth_call", function () {
    it("is able to return DAI total supply", async function () {
      const daiTotalSupplySelector = "0x18160ddd";
      const daiAddress = bufferToHex(DAI_ADDRESS);

      const result = await this.provider.send("eth_call", [
        { to: daiAddress, data: daiTotalSupplySelector },
      ]);

      const bnResult = new BN(toBuffer(result));
      assert.isTrue(bnResult.gtn(0));
    });
  });

  describe("get_balance", function () {
    it("returns the balance of the WETH contract", async function () {
      const result = await this.provider.send("eth_getBalance", [
        bufferToHex(WETH_ADDRESS),
      ]);
      assert.isTrue(quantityToBN(result).gtn(0));
    });
  });

  describe("eth_sendTransaction", () => {
    it("supports Ether transfers between local accounts", async function () {
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);

      await assertNodeBalances(this.provider, [
        DEFAULT_ACCOUNTS_BALANCES[0].subn(1 + 21000),
        DEFAULT_ACCOUNTS_BALANCES[1].addn(1),
      ]);

      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          value: numberToRpcQuantity(2),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(2),
        },
      ]);

      await assertNodeBalances(this.provider, [
        DEFAULT_ACCOUNTS_BALANCES[0].subn(1 + 21000 + 2 + 21000 * 2),
        DEFAULT_ACCOUNTS_BALANCES[1].addn(1 + 2),
      ]);
    });

    it("supports Ether transfers to remote accounts", async function () {
      const result = await this.provider.send("eth_getBalance", [
        bufferToHex(BITFINEX_WALLET_ADDRESS),
      ]);
      const initialBalance = quantityToBN(result);
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: bufferToHex(BITFINEX_WALLET_ADDRESS),
          value: numberToRpcQuantity(100),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);
      const balance = await this.provider.send("eth_getBalance", [
        bufferToHex(BITFINEX_WALLET_ADDRESS),
      ]);
      assertQuantity(balance, initialBalance.addn(100));
    });

    it("supports wrapping of Ether", async function () {
      const wethBalanceOfSelector = `0x70a08231${setLength(
        DEFAULT_ACCOUNTS_ADDRESSES[0],
        32
      ).toString("hex")}`;

      const getWrappedBalance = async () =>
        dataToBN(
          await this.provider.send("eth_call", [
            { to: bufferToHex(WETH_ADDRESS), data: wethBalanceOfSelector },
          ])
        );

      const initialBalance = await getWrappedBalance();
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: bufferToHex(WETH_ADDRESS),
          data: WETH_DEPOSIT_SELECTOR,
          value: numberToRpcQuantity(100),
          gas: numberToRpcQuantity(50000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);
      const balance = await getWrappedBalance();
      assert.equal(
        balance.toString("hex"),
        initialBalance.addn(100).toString("hex")
      );
    });

    it("returns a valid transaction hash", async function () {
      const transactionHash = await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);

      assert.match(transactionHash, /^0x[a-f\d]{64}$/);
    });
  });

  describe("eth_getTransactionByHash", () => {
    it("supports local transactions", async function () {
      const transactionHash = await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);

      const transaction = await this.provider.send("eth_getTransactionByHash", [
        transactionHash,
      ]);

      assert.equal(transaction.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
      assert.equal(transaction.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
      assert.equal(transaction.value, numberToRpcQuantity(1));
      assert.equal(transaction.gas, numberToRpcQuantity(21000));
      assert.equal(transaction.gasPrice, numberToRpcQuantity(1));
    });

    it("supports remote transactions", async function () {
      const transaction = await this.provider.send("eth_getTransactionByHash", [
        bufferToHex(FIRST_TX_HASH_OF_10496585),
      ]);

      assert.equal(
        transaction.from,
        "0x4e87582f5e48f3e505b7d3b544972399ad9f2e5f"
      );
      assert.equal(
        transaction.to,
        "0xdac17f958d2ee523a2206206994597c13d831ec7"
      );
    });
  });

  describe("eth_getTransactionReceipt", () => {
    it("supports local transactions", async function () {
      const transactionHash = await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);

      const receipt = await this.provider.send("eth_getTransactionReceipt", [
        transactionHash,
      ]);

      assert.equal(receipt.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
      assert.equal(receipt.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
      assert.equal(receipt.gasUsed, numberToRpcQuantity(21000));
    });

    it("supports remote transactions", async function () {
      const receipt = await this.provider.send("eth_getTransactionReceipt", [
        bufferToHex(FIRST_TX_HASH_OF_10496585),
      ]);

      assert.equal(receipt.from, "0x4e87582f5e48f3e505b7d3b544972399ad9f2e5f");
      assert.equal(receipt.to, "0xdac17f958d2ee523a2206206994597c13d831ec7");
    });
  });

  describe("eth_getLogs", () => {
    it("supports getting remote logs", async function () {
      const logs = await this.provider.send("eth_getLogs", [
        {
          fromBlock: numberToRpcQuantity(BLOCK_NUMBER_OF_10496585),
          toBlock: numberToRpcQuantity(BLOCK_NUMBER_OF_10496585),
        },
      ]);

      assert.equal(logs.length, 205);
    });
  });

  describe("evm_revert", () => {
    it("reverts the state of the blockchain to a previous snapshot", async function () {
      const getWethBalance = async () =>
        this.provider.send("eth_getBalance", [bufferToHex(WETH_ADDRESS)]);

      const initialBalance = await getWethBalance();
      const snapshotId = await this.provider.send("evm_snapshot", []);
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: bufferToHex(WETH_ADDRESS),
          data: WETH_DEPOSIT_SELECTOR,
          value: numberToRpcQuantity(100),
          gas: numberToRpcQuantity(50000),
          gasPrice: numberToRpcQuantity(1),
        },
      ]);
      assert.notEqual(await getWethBalance(), initialBalance);

      const reverted = await this.provider.send("evm_revert", [snapshotId]);
      assert.isTrue(reverted);
      assert.equal(await getWethBalance(), initialBalance);
    });

    it("deletes previous blocks", async function () {
      const snapshotId: string = await this.provider.send("evm_snapshot", []);
      const initialLatestBlock = await this.provider.send(
        "eth_getBlockByNumber",
        ["latest", false]
      );

      await this.provider.send("evm_mine");
      await this.provider.send("evm_mine");
      const latestBlockBeforeReverting = await this.provider.send(
        "eth_getBlockByNumber",
        ["latest", false]
      );

      const reverted = await this.provider.send("evm_revert", [snapshotId]);
      assert.isTrue(reverted);

      const newLatestBlock = await this.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      assert.equal(newLatestBlock.hash, initialLatestBlock.hash);

      const blockByHash = await this.provider.send("eth_getBlockByHash", [
        bufferToRpcData(latestBlockBeforeReverting.hash),
        false,
      ]);
      assert.isNull(blockByHash);

      const blockByNumber = await this.provider.send("eth_getBlockByNumber", [
        latestBlockBeforeReverting.number,
        false,
      ]);
      assert.isNull(blockByNumber);
    });

    it("deletes previous transactions", async function () {
      const [from] = await this.provider.send("eth_accounts");

      const snapshotId: string = await this.provider.send("evm_snapshot", []);

      const txHash = await this.provider.send("eth_sendTransaction", [
        {
          from,
          to: "0x1111111111111111111111111111111111111111",
          value: numberToRpcQuantity(1),
          gas: numberToRpcQuantity(100000),
          gasPrice: numberToRpcQuantity(1),
          nonce: numberToRpcQuantity(0),
        },
      ]);

      const reverted: boolean = await this.provider.send("evm_revert", [
        snapshotId,
      ]);
      assert.isTrue(reverted);

      const txHashAfter = await this.provider.send("eth_getTransactionByHash", [
        txHash,
      ]);
      assert.isNull(txHashAfter);
    });

    it("allows resending the same tx after a revert", async function () {
      const [from] = await this.provider.send("eth_accounts");

      const snapshotId: string = await this.provider.send("evm_snapshot", []);

      const txParams = {
        from,
        to: "0x1111111111111111111111111111111111111111",
        value: numberToRpcQuantity(1),
        gas: numberToRpcQuantity(100000),
        gasPrice: numberToRpcQuantity(1),
        nonce: numberToRpcQuantity(0),
      };

      const txHash = await this.provider.send("eth_sendTransaction", [
        txParams,
      ]);

      const reverted: boolean = await this.provider.send("evm_revert", [
        snapshotId,
      ]);
      assert.isTrue(reverted);

      const txHash2 = await this.provider.send("eth_sendTransaction", [
        txParams,
      ]);

      assert.equal(txHash2, txHash);
    });
  });
});
