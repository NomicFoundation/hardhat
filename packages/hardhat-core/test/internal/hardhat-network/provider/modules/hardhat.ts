import { assert } from "chai";
import { bufferToHex } from "ethereumjs-util";
import sinon from "sinon";

import { numberToRpcQuantity } from "../../../../../src/internal/hardhat-network/provider/output";
import { ALCHEMY_URL } from "../../../../setup";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import { assertInvalidArgumentsError } from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../helpers/constants";
import { quantityToNumber } from "../../helpers/conversions";
import { setCWD } from "../../helpers/cwd";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../../helpers/providers";

describe("Hardhat module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures({ isFork });

    describe(`${name} provider`, function () {
      const safeBlockInThePast = 11_200_000; // this should resolve CI errors probably caused by using a block too far in the past

      setCWD();
      useProvider();

      describe("hardhat_impersonateAccount", function () {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_impersonateAccount",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_impersonateAccount",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true", async function () {
          const result = await this.provider.send(
            "hardhat_impersonateAccount",
            [bufferToHex(EMPTY_ACCOUNT_ADDRESS)]
          );
          assert.isTrue(result);
        });
      });

      describe("hardhat_stopImpersonatingAccount", function () {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_stopImpersonatingAccount",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_stopImpersonatingAccount",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true if the account was impersonated before", async function () {
          await this.provider.send("hardhat_impersonateAccount", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          const result = await this.provider.send(
            "hardhat_stopImpersonatingAccount",
            [bufferToHex(EMPTY_ACCOUNT_ADDRESS)]
          );
          assert.isTrue(result);
        });

        it("returns false if the account wasn't impersonated before", async function () {
          const result = await this.provider.send(
            "hardhat_stopImpersonatingAccount",
            [bufferToHex(EMPTY_ACCOUNT_ADDRESS)]
          );
          assert.isFalse(result);
        });
      });

      describe("hardhat_reset", function () {
        before(function () {
          if (ALCHEMY_URL === undefined || ALCHEMY_URL === "") {
            this.skip();
          }
        });

        it("validates input parameters", async function () {
          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            { forking: {} },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: 123,
              },
            },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                blockNumber: 0,
              },
            },
          ]);

          await assertInvalidArgumentsError(this.provider, "hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: ALCHEMY_URL,
                blockNumber: "0",
              },
            },
          ]);
        });

        it("returns true", async function () {
          const result = await this.provider.send("hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: ALCHEMY_URL,
                blockNumber: safeBlockInThePast,
              },
            },
          ]);
          assert.isTrue(result);
        });

        it("hardhat_reset resets tx pool", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: "0x1111111111111111111111111111111111111111",
              nonce: numberToRpcQuantity(0),
            },
          ]);

          const pendingTxsBefore = await this.provider.send(
            "eth_pendingTransactions"
          );

          const result = await this.provider.send("hardhat_reset");

          const pendingTxsAfter = await this.provider.send(
            "eth_pendingTransactions"
          );

          assert.isTrue(result);
          assert.lengthOf(pendingTxsBefore, 1);
          assert.lengthOf(pendingTxsAfter, 0);
        });

        describe("tests using sinon", () => {
          let sinonClock: sinon.SinonFakeTimers;

          beforeEach(() => {
            sinonClock = sinon.useFakeTimers({
              now: Date.now(),
              toFake: ["Date", "setTimeout", "clearTimeout"],
            });
          });

          afterEach(() => {
            sinonClock.restore();
          });

          it("resets interval mining", async function () {
            const interval = 15_000;

            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("evm_setIntervalMining", [interval]);

            const firstBlockBefore = await getLatestBlockNumber();

            await sinonClock.tickAsync(interval);

            const secondBlockBefore = await getLatestBlockNumber();
            assert.equal(secondBlockBefore, firstBlockBefore + 1);

            const result = await this.provider.send("hardhat_reset");
            assert.isTrue(result);

            const firstBlockAfter = await getLatestBlockNumber();

            await sinonClock.tickAsync(interval);

            const secondBlockAfter = await getLatestBlockNumber();
            assert.equal(secondBlockAfter, firstBlockAfter);
          });
        });

        if (isFork) {
          testForkedProviderBehaviour();
        } else {
          testNormalProviderBehaviour();
        }

        const getLatestBlockNumber = async () => {
          return quantityToNumber(
            await this.ctx.provider.send("eth_blockNumber")
          );
        };

        function testForkedProviderBehaviour() {
          it("can reset the forked provider to a given forkBlockNumber", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            assert.equal(await getLatestBlockNumber(), safeBlockInThePast);
          });

          it("can reset the forked provider to the latest block number", async function () {
            const initialBlock = await getLatestBlockNumber();
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            await this.provider.send("hardhat_reset", [
              { forking: { jsonRpcUrl: ALCHEMY_URL } },
            ]);

            // This condition is rather loose as Infura can sometimes return
            // a smaller block number on subsequent eth_blockNumber call
            assert.closeTo(await getLatestBlockNumber(), initialBlock, 4);
          });

          it("can reset the forked provider to a normal provider", async function () {
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);

            await this.provider.send("hardhat_reset", [{}]);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }

        function testNormalProviderBehaviour() {
          it("can reset the provider to initial state", async function () {
            await this.provider.send("evm_mine");
            assert.equal(await getLatestBlockNumber(), 1);
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });

          it("can reset the provider with a fork config", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            assert.equal(await getLatestBlockNumber(), safeBlockInThePast);
          });

          it("can reset the provider with fork config back to normal config", async function () {
            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);
            await this.provider.send("hardhat_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }
      });

      describe("hardhat_dropTransaction", function () {
        it("should remove pending transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);
          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isNull(tx);
          assert.isTrue(result);
        });

        it("should remove queued transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isNull(tx);
          assert.isTrue(result);
        });

        it("should rearrange transactions after removing one", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          // send 3 txs
          const txHash1 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);
          const txHash2 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);
          const txHash3 = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          // drop second transaction
          const result = await this.provider.send("hardhat_dropTransaction", [
            txHash2,
          ]);
          assert.isTrue(result);

          // mine block; it should have only the first tx
          await this.provider.send("evm_mine");
          const block = await this.provider.send("eth_getBlockByNumber", [
            "latest",
            false,
          ]);
          assert.deepEqual(block.transactions, [txHash1]);

          // the first and third tx should exist
          const tx1 = await this.provider.send("eth_getTransactionByHash", [
            txHash1,
          ]);
          const tx2 = await this.provider.send("eth_getTransactionByHash", [
            txHash2,
          ]);
          const tx3 = await this.provider.send("eth_getTransactionByHash", [
            txHash3,
          ]);

          assert.isNotNull(tx1);
          assert.isNull(tx2);
          assert.isNotNull(tx3);
        });

        it("should return false if a tx doesn't exist", async function () {
          const nonExistentTxHash =
            "0xa4b46baa47145cb30af1ceed6172604aed4d8a27f66077cad951113bebb9513d";
          const result = await this.provider.send("hardhat_dropTransaction", [
            nonExistentTxHash,
          ]);

          assert.isFalse(result);
        });

        it("should return false when called a second time", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              gas: numberToRpcQuantity(21_000),
            },
          ]);

          const firstResult = await this.provider.send(
            "hardhat_dropTransaction",
            [txHash]
          );
          assert.isTrue(firstResult);
          const secondResult = await this.provider.send(
            "hardhat_dropTransaction",
            [txHash]
          );
          assert.isFalse(secondResult);
        });

        it("should throw if the tx was already mined", async function () {
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
            },
          ]);

          await assertInvalidArgumentsError(
            this.provider,
            "hardhat_dropTransaction",
            [txHash]
          );
        });
      });
    });
  });
});
