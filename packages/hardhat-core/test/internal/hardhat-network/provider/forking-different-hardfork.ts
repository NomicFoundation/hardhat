import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcDataToBigInt,
} from "../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import { DAI_ADDRESS } from "../helpers/constants";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  FORKED_PROVIDERS,
} from "../helpers/providers";

const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";

// mainnet hardforks
const CANCUN_HARDFORK_BLOCK_NUMBER = -1; // TBD
const SHANGHAI_HARDFORK_BLOCK_NUMBER = 17_034_870;
const MERGE_HARDFORK_BLOCK_NUMBER = 15_537_394;

// sepolia hardforks (for temporary testing)
// const CANCUN_HARDFORK_BLOCK_NUMBER = 5_187_023;
// const SHANGHAI_HARDFORK_BLOCK_NUMBER = 2_990_908;

// this block should have a non-empty list of withdrawals
const BLOCK_WITH_WITHDRAWALS = 17_034_920;

const BLOCK_WITH_WITHDRAWALS_EXPECTED_ROOT =
  "0x23bf85b92f3a2695d13463d84de157c3f43d0fe201348d638693fcfa87734d5e";

describe("Forking a block with a different hardfork", function () {
  FORKED_PROVIDERS.forEach(({ rpcProvider, useProvider }) => {
    workaroundWindowsCiFailures.call(this, { isFork: true });

    describe(`Using ${rpcProvider}`, function () {
      setCWD();

      describe("before and after shanghai", function () {
        describe("shanghai hardfork", function () {
          const hardfork = "shanghai";

          describe("forking a 'shanghai' block", function () {
            const forkBlockNumber = SHANGHAI_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              hardfork,
              forkBlockNumber,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                5022305384218217259061852351n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                5022305384218217259061852351n
              );
            });

            it("should have shanghai fields in blocks before and after the fork", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(BLOCK_WITH_WITHDRAWALS), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.strictEqual(
                blockBeforeFork.withdrawalsRoot,
                BLOCK_WITH_WITHDRAWALS_EXPECTED_ROOT
              );
              assert.isNotEmpty(blockBeforeFork.withdrawals);

              assert.isDefined(blockAfterFork.withdrawalsRoot);
              assert.isDefined(blockAfterFork.withdrawals);
            });
          });

          describe("forking a 'merge' block", function () {
            const forkBlockNumber = MERGE_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              forkBlockNumber,
              hardfork,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                6378560137543824474512862351n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                6378560137543824474512862351n
              );
            });

            it("should have shanghai fields in blocks after the fork but not before", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.isUndefined(blockBeforeFork.withdrawalsRoot);
              assert.isUndefined(blockBeforeFork.withdrawals);
              assert.isDefined(blockAfterFork.withdrawalsRoot);
              assert.isDefined(blockAfterFork.withdrawals);
            });
          });
        });

        describe("merge hardfork", function () {
          const hardfork = "merge";

          describe("forking a 'shanghai' block", function () {
            const forkBlockNumber = SHANGHAI_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              forkBlockNumber,
              hardfork,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                5022305384218217259061852351n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                5022305384218217259061852351n
              );
            });

            it("should have shanghai fields in blocks before the fork but not after", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(BLOCK_WITH_WITHDRAWALS), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.strictEqual(
                blockBeforeFork.withdrawalsRoot,
                BLOCK_WITH_WITHDRAWALS_EXPECTED_ROOT
              );
              assert.isNotEmpty(blockBeforeFork.withdrawals);

              assert.isUndefined(blockAfterFork.withdrawalsRoot);
              assert.isUndefined(blockAfterFork.withdrawals);
            });
          });

          describe("forking a 'merge' block", function () {
            const forkBlockNumber = MERGE_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              forkBlockNumber,
              hardfork,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                6378560137543824474512862351n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                6378560137543824474512862351n
              );
            });

            it("shouldn't have shanghai fields in blocks before or after the fork", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.isUndefined(blockBeforeFork.withdrawalsRoot);
              assert.isUndefined(blockBeforeFork.withdrawals);
              assert.isUndefined(blockAfterFork.withdrawalsRoot);
              assert.isUndefined(blockAfterFork.withdrawals);
            });
          });
        });
      });

      describe.skip("before and after cancun", function () {
        describe("cancun hardfork", function () {
          const hardfork = "cancun";

          describe("forking a 'cancun' block", function () {
            const forkBlockNumber = CANCUN_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              hardfork,
              forkBlockNumber,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should have cancun fields in blocks before and after the fork", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.strictEqual(
                blockBeforeFork.parentBeaconBlockRoot,
                "0xaa1c8fd7476ed6519cbb694784df5038ed7b008f05e2ad40585efc6c790d69de"
              );
              assert.strictEqual(blockBeforeFork.blobGasUsed, "0xa0000");
              assert.strictEqual(blockBeforeFork.excessBlobGas, "0x13a0000");

              assert.strictEqual(
                blockAfterFork.parentBeaconBlockRoot,
                "0xdd8876ba5af271ae9d93ececb192d6a7b4e6094ca5999756336279fd796b8619"
              );
              assert.strictEqual(blockAfterFork.blobGasUsed, "0x0");
              assert.strictEqual(blockAfterFork.excessBlobGas, "0x1400000");
            });
          });

          describe("forking a 'shanghai' block", function () {
            const forkBlockNumber = CANCUN_HARDFORK_BLOCK_NUMBER - 100;

            useProvider({
              hardfork,
              forkBlockNumber,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should have cancun fields in blocks after the fork but not before", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.isUndefined(blockBeforeFork.parentBeaconBlockRoot);
              assert.isUndefined(blockBeforeFork.blobGasUsed);
              assert.isUndefined(blockBeforeFork.excessBlobGas);

              assert.strictEqual(
                blockAfterFork.parentBeaconBlockRoot,
                "0xdd8876ba5af271ae9d93ececb192d6a7b4e6094ca5999756336279fd796b8619"
              );
              assert.strictEqual(blockAfterFork.blobGasUsed, "0x0");
              assert.strictEqual(blockAfterFork.excessBlobGas, "0x0");
            });
          });
        });

        describe("shanghai hardfork", function () {
          const hardfork = "shanghai";

          describe("forking a 'cancun' block", function () {
            const forkBlockNumber = CANCUN_HARDFORK_BLOCK_NUMBER + 100;

            useProvider({
              hardfork,
              forkBlockNumber,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should have cancun fields in blocks before the fork but not after", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.strictEqual(
                blockBeforeFork.parentBeaconBlockRoot,
                "0xaa1c8fd7476ed6519cbb694784df5038ed7b008f05e2ad40585efc6c790d69de"
              );
              assert.strictEqual(blockBeforeFork.blobGasUsed, "0xa0000");
              assert.strictEqual(blockBeforeFork.excessBlobGas, "0x13a0000");

              assert.isUndefined(blockAfterFork.parentBeaconBlockRoot);
              assert.isUndefined(blockAfterFork.blobGasUsed);
              assert.isUndefined(blockAfterFork.excessBlobGas);
            });
          });

          describe("forking a 'shanghai' block", function () {
            const forkBlockNumber = CANCUN_HARDFORK_BLOCK_NUMBER - 100;

            useProvider({
              hardfork,
              forkBlockNumber,
            });

            it("should mine transactions", async function () {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                },
              ]);
            });

            it("should make calls in the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("should make calls in blocks before the forked block", async function () {
              const daiSupply = await this.provider.send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DAI_ADDRESS.toString(),
                  data: TOTAL_SUPPLY_SELECTOR,
                },
                numberToRpcQuantity(forkBlockNumber - 1),
              ]);

              assert.strictEqual(
                rpcDataToBigInt(daiSupply),
                78634811100000031000021500n
              );
            });

            it("shouldn't have cancun fields in blocks before or after the fork", async function () {
              await this.provider.send("hardhat_mine", []);
              await this.provider.send("hardhat_mine", []);

              const blockBeforeFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber - 1), false]
              );

              const blockAfterFork = await this.provider.send(
                "eth_getBlockByNumber",
                [numberToRpcQuantity(forkBlockNumber + 1), false]
              );

              assert.isUndefined(blockBeforeFork.parentBeaconBlockRoot);
              assert.isUndefined(blockBeforeFork.blobGasUsed);
              assert.isUndefined(blockBeforeFork.excessBlobGas);

              assert.isUndefined(blockAfterFork.parentBeaconBlockRoot);
              assert.isUndefined(blockAfterFork.blobGasUsed);
              assert.isUndefined(blockAfterFork.excessBlobGas);
            });
          });
        });
      });
    });
  });
});
