import Common from "@ethereumjs/common";
import { AccessListEIP2930Transaction, Transaction } from "@ethereumjs/tx";
import { assert } from "chai";
import { BN, bufferToHex, toBuffer, zeroAddress } from "ethereumjs-util";
import { Context } from "mocha";

import {
  bufferToRpcData,
  numberToRpcQuantity,
  rpcDataToNumber,
  rpcQuantityToBN,
  rpcQuantityToNumber,
} from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { InvalidInputError } from "../../../../../src/internal/core/providers/errors";
import { randomAddress } from "../../../../../src/internal/hardhat-network/provider/fork/random";
import { COINBASE_ADDRESS } from "../../../../../src/internal/hardhat-network/provider/node";
import { TransactionParams } from "../../../../../src/internal/hardhat-network/provider/node-types";
import {
  RpcBlockOutput,
  RpcReceiptOutput,
  RpcTransactionOutput,
} from "../../../../../src/internal/hardhat-network/provider/output";
import { getCurrentTimestamp } from "../../../../../src/internal/hardhat-network/provider/utils/getCurrentTimestamp";
import {
  EthereumProvider,
  EthSubscription,
  ProviderMessage,
} from "../../../../../src/types";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidArgumentsError,
  assertInvalidInputError,
  assertNodeBalances,
  assertNotSupported,
  assertPendingNodeBalances,
  assertProviderError,
  assertQuantity,
  assertReceiptMatchesGethOne,
  assertTransaction,
  assertTransactionFailure,
} from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../helpers/constants";
import {
  EXAMPLE_BLOCKHASH_CONTRACT,
  EXAMPLE_CONTRACT,
  EXAMPLE_READ_CONTRACT,
  EXAMPLE_REVERT_CONTRACT,
  EXAMPLE_SETTER_CONTRACT,
} from "../../helpers/contracts";
import { setCWD } from "../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_ACCOUNTS_BALANCES,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_NETWORK_ID,
  PROVIDERS,
} from "../../helpers/providers";
import { retrieveForkBlockNumber } from "../../helpers/retrieveForkBlockNumber";
import { sendDummyTransaction } from "../../helpers/sendDummyTransaction";
import {
  deployContract,
  getSignedTxHash,
  sendTransactionFromTxParams,
  sendTxToZeroAddress,
} from "../../helpers/transactions";
import { useProvider as importedUseProvider } from "../../helpers/useProvider";

// tslint:disable-next-line no-var-requires
const { recoverTypedSignature_v4 } = require("eth-sig-util");

const PRECOMPILES_COUNT = 8;

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, isJsonRpc, chainId }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      describe("eth_accounts", async function () {
        it("should return the genesis accounts in lower case", async function () {
          const accounts = await this.provider.send("eth_accounts");

          assert.deepEqual(accounts, DEFAULT_ACCOUNTS_ADDRESSES);
        });
      });

      describe("eth_blockNumber", async function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("should return the current block number as QUANTITY", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 1);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 2);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 3);
        });

        it("Should increase if a transaction gets to execute and fails", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          try {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: "0x0000000000000000000000000000000000000001",
                gas: numberToRpcQuantity(21000), // Address 1 is a precompile, so this will OOG
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.fail("Tx should have failed");
          } catch (e) {
            assert.notInclude(e.message, "Tx should have failed");
          }

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 1);
        });

        it("Shouldn't increase if a call is made", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x0000000000000000000000000000000000000000",
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);
        });
      });

      describe("eth_call", async function () {
        describe("when called without blockTag param", () => {
          it("Should return the value returned by the contract", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
            ]);

            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });

          it("Should return the value returned by the contract using an unknown account as from", async function () {
            const from = "0x1234567890123456789012345678901234567890";

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i, from },
            ]);

            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i, from },
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });

          it("Should be run in the context of the last block", async function () {
            const firstBlock = await getFirstBlock();
            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
            ]);

            assert.equal(timestampResult, timestamp);
          });

          it("Should return an empty buffer when a non-contract account is called", async function () {
            const result = await this.provider.send("eth_call", [
              {
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: EXAMPLE_CONTRACT.selectors.i,
              },
            ]);

            assert.equal(result, "0x");
          });

          it("Should work with blockhashes calls", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_BLOCKHASH_CONTRACT.bytecode.object}`
            );

            const resultBlock0 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test0,
              },
            ]);

            assert.lengthOf(resultBlock0, 66);

            const resultBlock1 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test1,
              },
            ]);

            assert.lengthOf(resultBlock1, 66);

            const resultBlock1m = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_BLOCKHASH_CONTRACT.selectors.test1m,
              },
            ]);

            assert.equal(
              resultBlock1m,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );
          });

          it("should run in the context of the blocktag's block", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockNumber = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber", [])
            );

            await this.provider.send("evm_mine", []);
            await this.provider.send("evm_mine", []);

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              numberToRpcQuantity(blockNumber),
            ]);

            assert.equal(rpcDataToNumber(blockResult), blockNumber);
          });

          it("should accept a gas limit higher than the block gas limit being used", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockNumber = rpcQuantityToNumber(
              await this.provider.send("eth_blockNumber", [])
            );

            const gas = "0x5f5e100"; // 100M gas

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
                gas,
              },
              numberToRpcQuantity(blockNumber),
            ]);

            assert.equal(rpcDataToNumber(blockResult), blockNumber);

            const blockResult2 = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
                gas,
              },
              "pending",
            ]);

            assert.equal(rpcDataToNumber(blockResult2), blockNumber + 1);
          });
        });

        describe("when called with 'latest' blockTag param", () => {
          it("Should be run in the context of the last block", async function () {
            const firstBlock = await getFirstBlock();
            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              "latest",
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
              "latest",
            ]);

            assert.equal(timestampResult, timestamp);
          });
        });

        describe("when called with 'pending' blockTag param", () => {
          it("Should be run in the context of a new block", async function () {
            const firstBlock = await getFirstBlock();
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            const timestamp = getCurrentTimestamp() + 60;
            await this.provider.send("evm_setNextBlockTimestamp", [timestamp]);

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              "pending",
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 2);

            const timestampResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
              },
              "pending",
            ]);

            assert.equal(timestampResult, timestamp);
          });

          it("Should be run in the context with pending transactions mined", async function () {
            const snapshotId = await this.provider.send("evm_snapshot");
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            await this.provider.send("evm_revert", [snapshotId]);
            await this.provider.send("evm_setAutomine", [false]);
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
                gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
              },
            ]);

            const result = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
              "pending",
            ]);

            // result would equal "0x" if the contract wasn't deployed
            assert.equal(
              result,
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            await this.provider.send("evm_mine");

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
              },
            ]);

            const result2 = await this.provider.send("eth_call", [
              { to: contractAddress, data: EXAMPLE_CONTRACT.selectors.i },
              "pending",
            ]);

            assert.equal(
              result2,
              "0x000000000000000000000000000000000000000000000000000000000000000a"
            );
          });
        });

        describe("when called with a block number as blockTag param", () => {
          it("Should be run in the context of the block passed as a parameter", async function () {
            const firstBlock = await getFirstBlock();

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );

            await this.provider.send("evm_mine");
            await this.provider.send("evm_mine");
            await this.provider.send("evm_mine");

            const blockResult = await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
              numberToRpcQuantity(firstBlock + 1),
            ]);

            assert.equal(rpcDataToNumber(blockResult), firstBlock + 1);
          });

          it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
            const firstBlock = await getFirstBlock();
            const futureBlock = firstBlock + 1;

            await assertInvalidInputError(
              this.provider,
              "eth_call",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  value: numberToRpcQuantity(123),
                },
                numberToRpcQuantity(futureBlock),
              ],
              `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
            );
          });

          it("Should leverage block tag parameter", async function () {
            const firstBlock = await getFirstBlock();

            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_CONTRACT.bytecode.object}`
            );

            const newState =
              "000000000000000000000000000000000000000000000000000000000000000a";

            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
              },
            ]);

            assert.equal(
              await this.provider.send("eth_call", [
                {
                  to: contractAddress,
                  data: EXAMPLE_CONTRACT.selectors.i,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                },
                numberToRpcQuantity(firstBlock + 1),
              ]),
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            );

            assert.equal(
              await this.provider.send("eth_call", [
                {
                  to: contractAddress,
                  data: EXAMPLE_CONTRACT.selectors.i,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                },
                "latest",
              ]),
              `0x${newState}`
            );
          });

          it("Should return the initial balance for the genesis accounts in the previous block after a transaction", async function () {
            const blockNumber = await this.provider.send("eth_blockNumber");
            const account = DEFAULT_ACCOUNTS_ADDRESSES[0];

            const initialBalanceBeforeTx = await this.provider.send(
              "eth_getBalance",
              [account, blockNumber]
            );
            assert.equal(initialBalanceBeforeTx, "0xde0b6b3a7640000");

            await sendTxToZeroAddress(this.provider, account);

            const initialBalanceAfterTx = await this.provider.send(
              "eth_getBalance",
              [account, blockNumber]
            );
            assert.equal(initialBalanceAfterTx, "0xde0b6b3a7640000");
          });
        });
      });

      describe("eth_chainId", async function () {
        it("should return the chain id as QUANTITY", async function () {
          assertQuantity(await this.provider.send("eth_chainId"), chainId);
        });
      });

      describe("eth_coinbase", async function () {
        it("should return the the hardcoded coinbase address", async function () {
          assert.equal(
            await this.provider.send("eth_coinbase"),
            COINBASE_ADDRESS.toString()
          );
        });
      });

      describe("eth_compileLLL", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileLLL");
        });
      });

      describe("eth_compileSerpent", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileSerpent");
        });
      });

      describe("eth_compileSolidity", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileSolidity");
        });
      });

      describe("eth_estimateGas", async function () {
        it("should estimate the gas for a transfer", async function () {
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: zeroAddress(),
              to: zeroAddress(),
            },
          ]);

          assert.isTrue(new BN(toBuffer(estimation)).lten(23000));
        });

        it("should leverage block tag parameter", async function () {
          const firstBlock = await getFirstBlock();
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            numberToRpcQuantity(firstBlock + 1),
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
        });

        it("should estimate gas in the context of pending block when called with 'pending' blockTag param", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "latest",
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "pending",
          ]);

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_estimateGas",
            [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(123),
              },
              numberToRpcQuantity(futureBlock),
            ],
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
          );
        });

        it("Should use pending as default blockTag", async function () {
          if (isFork) {
            this.skip();
          }

          const blockNumber = await this.provider.send("eth_blockNumber");
          assert.equal(blockNumber, "0x0");

          // We estimate the deployment of a contract that asserts that block.number > 0,
          // which would fail if the estimation was run on `latest` right after the network is initialized
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data:
                "0x6080604052348015600f57600080fd5b5060004311601957fe5b603f8060266000396000f3fe6080604052600080fdfea2646970667358221220f77641956f2e98e8fd65e712d73442aba66a133641d08a3058907caec561bb2364736f6c63430007040033",
            },
          ]);

          // We know that it should fit in 100k gas
          assert.isTrue(new BN(toBuffer(estimation)).lten(100000));
        });
      });

      describe("eth_gasPrice", async function () {
        it("should return a fixed gas price", async function () {
          assertQuantity(await this.provider.send("eth_gasPrice"), 8e9);
        });
      });

      describe("eth_getBalance", async function () {
        it("Should return 0 for empty accounts", async function () {
          if (!isFork) {
            assertQuantity(
              await this.provider.send("eth_getBalance", [zeroAddress()]),
              0
            );

            assertQuantity(
              await this.provider.send("eth_getBalance", [
                "0x0000000000000000000000000000000000000001",
              ]),
              0
            );
          }

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              EMPTY_ACCOUNT_ADDRESS.toString(),
            ]),
            0
          );
        });

        it("Should return the initial balance for the genesis accounts", async function () {
          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);
        });

        it("Should return the updated balance after a transaction is made", async function () {
          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);

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
            ...DEFAULT_ACCOUNTS_BALANCES.slice(2),
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
            ...DEFAULT_ACCOUNTS_BALANCES.slice(2),
          ]);
        });

        it("Should return the pending balance", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await assertPendingNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0],
            DEFAULT_ACCOUNTS_BALANCES[1].subn(1 + 21000),
            DEFAULT_ACCOUNTS_BALANCES[2].addn(1),
            ...DEFAULT_ACCOUNTS_BALANCES.slice(3),
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(2),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(2),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          await assertPendingNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0],
            DEFAULT_ACCOUNTS_BALANCES[1].subn(1 + 21000 + 2 + 21000 * 2),
            DEFAULT_ACCOUNTS_BALANCES[2].addn(1 + 2),
            ...DEFAULT_ACCOUNTS_BALANCES.slice(3),
          ]);
        });

        it("Should return the original balance after a call is made", async function () {
          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
            },
          ]);

          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              value: numberToRpcQuantity(1),
            },
          ]);

          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);
        });

        it("should assign the block reward to the coinbase address", async function () {
          const coinbase = await this.provider.send("eth_coinbase");

          assertQuantity(
            await this.provider.send("eth_getBalance", [coinbase]),
            0
          );

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
            },
          ]);

          const balance = new BN(
            toBuffer(await this.provider.send("eth_getBalance", [coinbase]))
          );

          assert.isTrue(balance.gtn(0));

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
            },
          ]);

          const balance2 = new BN(
            toBuffer(await this.provider.send("eth_getBalance", [coinbase]))
          );

          assert.isTrue(balance2.gt(balance));
        });

        it("should leverage block tag parameter", async function () {
          const firstBlock = await getFirstBlock();
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: EMPTY_ACCOUNT_ADDRESS.toString(),
              value: numberToRpcQuantity(1),
            },
          ]);

          if (!isFork) {
            assert.strictEqual(
              await this.provider.send("eth_getBalance", [
                EMPTY_ACCOUNT_ADDRESS.toString(),
                "earliest",
              ]),
              "0x0"
            );
          }

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              EMPTY_ACCOUNT_ADDRESS.toString(),
              numberToRpcQuantity(firstBlock),
            ]),
            "0x0"
          );

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              EMPTY_ACCOUNT_ADDRESS.toString(),
              numberToRpcQuantity(firstBlock + 1),
            ]),
            "0x1"
          );

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              EMPTY_ACCOUNT_ADDRESS.toString(),
            ]),
            "0x1"
          );
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_getBalance",
            [DEFAULT_ACCOUNTS_ADDRESSES[0], numberToRpcQuantity(futureBlock)],
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
          );
        });
      });

      describe("eth_getBlockByHash", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getBlockByHash", [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
              false,
            ])
          );

          assert.isNull(
            await this.provider.send("eth_getBlockByHash", [
              "0x0000000000000000000000000000000000000000000000000000000000000123",
              true,
            ])
          );
        });

        it("Should return the block with transaction hashes if the second argument is false", async function () {
          const firstBlock = await getFirstBlock();
          const txHash = await sendTxToZeroAddress(this.provider);
          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByHash",
            [txOutput.blockHash, false]
          );

          assert.equal(block.hash, txOutput.blockHash);
          assertQuantity(block.number, firstBlock + 1);
          assert.equal(block.transactions.length, 1);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, COINBASE_ADDRESS.toString());
          assert.isEmpty(block.uncles);
        });

        it("Should return the block with the complete transactions if the second argument is true", async function () {
          const firstBlock = await getFirstBlock();
          const txHash = await sendTxToZeroAddress(this.provider);
          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByHash",
            [txOutput.blockHash, true]
          );

          assert.equal(block.hash, txOutput.blockHash);
          assertQuantity(block.number, firstBlock + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.miner, COINBASE_ADDRESS.toString());
          assert.deepEqual(
            block.transactions[0] as RpcTransactionOutput,
            txOutput
          );
          assert.isEmpty(block.uncles);
        });
      });

      describe("eth_getBlockByNumber", async function () {
        it("Should return the genesis block for number 0", async function () {
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(0),
            false,
          ]);

          assert.equal(
            block.parentHash,
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          assertQuantity(block.number, 0);
          assert.isEmpty(block.transactions);
        });

        it("Should return null for unknown blocks", async function () {
          const firstBlock = await getFirstBlock();
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          assert.isNull(block);

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            true,
          ]);

          assert.isNull(block2);
        });

        it("Should return the new blocks", async function () {
          const firstBlockNumber = await getFirstBlock();
          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber + 1), false]
          );

          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, COINBASE_ADDRESS.toString());
          assert.isEmpty(block.uncles);
        });

        it("Should return the new pending block", async function () {
          const firstBlockNumber = await getFirstBlock();
          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          await this.provider.send("evm_setAutomine", [false]);
          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["pending", false]
          );

          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, COINBASE_ADDRESS.toString());
          assert.isEmpty(block.uncles);
        });

        it("should return the complete transactions if the second argument is true", async function () {
          const firstBlockNumber = await getFirstBlock();
          const firstBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber), false]
          );

          const txHash = await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlockNumber + 1), true]
          );

          assertQuantity(block.number, firstBlockNumber + 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.parentHash, firstBlock.hash);
          assert.equal(block.miner, COINBASE_ADDRESS.toString());
          assert.isEmpty(block.uncles);

          const txOutput = block.transactions[0] as RpcTransactionOutput;
          assert.equal(txOutput.hash, txHash);
          assert.equal(block.hash, txOutput.blockHash);
          assert.equal(block.number, txOutput.blockNumber);
          assert.equal(txOutput.transactionIndex, numberToRpcQuantity(0));

          assert.deepEqual(
            txOutput,
            await this.provider.send("eth_getTransactionByHash", [txHash])
          );
        });

        it(
          "should return the right block total difficulty",
          isFork ? testTotalDifficultyFork : testTotalDifficulty
        );

        async function testTotalDifficultyFork(this: Context) {
          const forkBlockNumber = await getFirstBlock();
          const forkBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(forkBlockNumber), false]
          );

          await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(forkBlockNumber + 1), false]
          );

          assertQuantity(
            block.totalDifficulty,
            rpcQuantityToBN(forkBlock.totalDifficulty).add(
              rpcQuantityToBN(block.difficulty)
            )
          );
        }

        async function testTotalDifficulty(this: Context) {
          const genesisBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(0), false]
          );

          assertQuantity(genesisBlock.totalDifficulty, 1);
          assertQuantity(genesisBlock.difficulty, 1);

          await sendTxToZeroAddress(this.provider);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(1), false]
          );

          assertQuantity(
            block.totalDifficulty,
            rpcQuantityToNumber(block.difficulty) + 1
          );
        }
      });

      describe("eth_getBlockTransactionCountByHash", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              "0x1111111111111111111111111111111111111111111111111111111111111111",
            ])
          );
        });

        it("Should return 0 for the genesis block", async function () {
          const genesisBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(0), false]
          );

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              genesisBlock.hash,
            ]),
            0
          );
        });

        it("Should return 1 for others", async function () {
          const txhash = await sendTxToZeroAddress(this.provider);

          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txhash]
          );

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              txOutput.blockHash,
            ]),
            1
          );
        });
      });

      describe("eth_getBlockTransactionCountByNumber", async function () {
        it("should return null for non-existing blocks", async function () {
          const firstBlock = await getFirstBlock();
          assert.isNull(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(firstBlock + 1),
            ])
          );
        });

        it("Should return 0 for the genesis block", async function () {
          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(0),
            ]),
            0
          );
        });

        it("Should return the number of transactions in the block", async function () {
          const firstBlock = await getFirstBlock();
          await sendTxToZeroAddress(this.provider);

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(firstBlock + 1),
            ]),
            1
          );
        });

        it("Should return the number of transactions in the 'pending' block", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await sendTxToZeroAddress(this.provider);

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              "pending",
            ]),
            1
          );
        });
      });

      describe("eth_getCode", async function () {
        it("Should return an empty buffer for non-contract accounts", async function () {
          assert.equal(
            await this.provider.send("eth_getCode", [zeroAddress()]),
            "0x"
          );
        });

        it("Should return an empty buffer for precompiles", async function () {
          for (let i = 1; i <= PRECOMPILES_COUNT; i++) {
            const precompileNumber = i.toString(16);
            const zero = zeroAddress();

            assert.equal(
              await this.provider.send("eth_getCode", [
                zero.substr(0, zero.length - precompileNumber.length) +
                  precompileNumber,
              ]),
              "0x"
            );
          }
        });

        it("Should return the deployed code", async function () {
          // This a deployment transaction that pushes 0x41 (i.e. ascii A) followed by 31 0s to
          // the stack, stores that in memory, and then returns the first byte from memory.
          // This deploys a contract which a single byte of code, 0x41.
          const contractAddress = await deployContract(
            this.provider,
            "0x7f410000000000000000000000000000000000000000000000000000000000000060005260016000f3"
          );

          assert.equal(
            await this.provider.send("eth_getCode", [contractAddress]),
            "0x41"
          );
        });

        it("Should leverage block tag parameter", async function () {
          const firstBlock = await getFirstBlock();
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          assert.strictEqual(
            await this.provider.send("eth_getCode", [
              exampleContract,
              numberToRpcQuantity(firstBlock),
            ]),
            "0x"
          );
        });

        it("Should return the deployed code in the context of a new block with 'pending' block tag param", async function () {
          const snapshotId = await this.provider.send("evm_snapshot");
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          assert.isNotNull(contractAddress);

          const contractCodeBefore = await this.provider.send("eth_getCode", [
            contractAddress,
            "latest",
          ]);

          await this.provider.send("evm_revert", [snapshotId]);
          await this.provider.send("evm_setAutomine", [false]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
              gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
            },
          ]);
          const txReceipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );
          const contractCodeAfter = await this.provider.send("eth_getCode", [
            contractAddress,
            "pending",
          ]);

          assert.isNull(txReceipt);
          assert.strictEqual(contractCodeAfter, contractCodeBefore);
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_getCode",
            [randomAddress().toString(), numberToRpcQuantity(futureBlock)],
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
          );
        });
      });

      describe("eth_getCompilers", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getCompilers");
        });
      });

      describe("block filters", function () {
        it("Supports block filters", async function () {
          assert.isString(await this.provider.send("eth_newBlockFilter"));
        });

        it("Supports uninstalling an existing filter", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Doesn't fail on uninstalling a non-existent filter", async function () {
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            "0x1",
          ]);

          assert.isFalse(uninstalled);
        });

        it("should start returning at least one block", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);
          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNotEmpty(blockHashes);
        });

        it("should not return the same block twice", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          await this.provider.send("eth_getFilterChanges", [filterId]);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isEmpty(blockHashes);
        });

        it("should return new blocks", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          const initialHashes = await this.provider.send(
            "eth_getFilterChanges",
            [filterId]
          );

          assert.lengthOf(initialHashes, 1);

          const empty = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isEmpty(empty);

          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.lengthOf(blockHashes, 3);
        });

        it("should return reorganized block", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          assert.lengthOf(
            await this.provider.send("eth_getFilterChanges", [filterId]),
            1
          );

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          await this.provider.send("evm_mine", []);
          const block1 = await this.provider.send("eth_getBlockByNumber", [
            await this.provider.send("eth_blockNumber"),
            false,
          ]);

          await this.provider.send("evm_revert", [snapshotId]);

          await this.provider.send("evm_mine", []);
          const block2 = await this.provider.send("eth_getBlockByNumber", [
            await this.provider.send("eth_blockNumber"),
            false,
          ]);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.deepEqual(blockHashes, [block1.hash, block2.hash]);
        });
      });

      describe("eth_getFilterLogs", async function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("Supports get filter logs", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [{}]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const logs = await this.provider.send("eth_getFilterLogs", [
            filterId,
          ]);
          assert.lengthOf(logs, 1);

          const log = logs[0];
          assert.equal(log.removed, false);
          assert.equal(log.logIndex, "0x0");
          assert.equal(log.transactionIndex, "0x0");
          assert.equal(rpcQuantityToNumber(log.blockNumber), firstBlock + 2);
          assert.equal(log.address, exampleContract);
          assert.equal(log.data, `0x${newState}`);
        });

        it("Supports uninstalling an existing log filter", async function () {
          const filterId = await this.provider.send("eth_newFilter", [{}]);
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Supports get filter logs with address", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              address: exampleContract,
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with topics", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with null topic", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                null,
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with multiple topics", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with fromBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const filterId = await this.provider.send("eth_newFilter", [
            {
              fromBlock: numberToRpcQuantity(firstBlock),
              address: exampleContract,
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x000000000000000000000000000000000000000000000000000000000000003b",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            2
          );
        });

        it("Supports get filter logs with toBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const filterId = await this.provider.send("eth_newFilter", [
            {
              fromBlock: numberToRpcQuantity(firstBlock),
              toBlock: numberToRpcQuantity(firstBlock + 2),
              address: exampleContract,
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x000000000000000000000000000000000000000000000000000000000000003b",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });
      });

      describe("eth_getLogs", async function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("Supports get logs", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: "0x0000000000000000000000000000000000000000",
              },
            ]),
            0
          );

          const logs = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
          ]);
          assert.lengthOf(logs, 1);

          const log = logs[0];
          assert.equal(log.removed, false);
          assert.equal(log.logIndex, "0x0");
          assert.equal(log.transactionIndex, "0x0");
          assert.equal(rpcQuantityToNumber(log.blockNumber), firstBlock + 2);
          assert.equal(log.address, exampleContract);
          assert.equal(log.data, `0x${newState}`);
        });

        it("Supports get logs with address", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: exampleContract,
              },
            ]),
            1
          );

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: "0x0000000000000000000000000000000000000000",
              },
            ]),
            0
          );
        });

        it("Supports get logs with topics", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
              },
            ]),
            1
          );

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              },
            ]),
            0
          );
        });

        it("Supports get logs with null topic", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  null,
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              },
            ]),
            1
          );
        });

        it("Supports get logs with multiple topic", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlock + 2),
                topics: [
                  [
                    "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                  ],
                  [
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    "0x000000000000000000000000000000000000000000000000000000000000003b",
                  ],
                ],
              },
            ]),
            2
          );
        });

        it("Supports get logs with fromBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlock + 3),
              },
            ]),
            1
          );
        });

        it("Supports get logs with toBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlock + 1),
                toBlock: numberToRpcQuantity(firstBlock + 2),
              },
            ]),
            1
          );
        });

        it("should accept out of bound block numbers", async function () {
          const logs = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              fromBlock: numberToRpcQuantity(firstBlock + 10000000),
            },
          ]);
          assert.lengthOf(logs, 0);

          const logs2 = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              fromBlock: numberToRpcQuantity(firstBlock),
              toBlock: numberToRpcQuantity(firstBlock + 1000000),
            },
          ]);
          assert.lengthOf(logs2, 0);
        });

        it("should return a new array every time", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const logs1 = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
          ]);

          logs1[0].address = "changed";

          const logs2 = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
          ]);

          assert.notEqual(logs1, logs2);
          assert.notEqual(logs1[0], logs2[0]);
          assert.notEqual(logs2[0].address, "changed");
        });

        it("should have logIndex for logs in remote blocks", async function () {
          if (!isFork) {
            this.skip();
          }

          const logs = await this.provider.send("eth_getLogs", [
            {
              address: "0x2A07fBCD64BE0e2329890C21c6F34e81889a5912",
              topics: [
                "0x8f7de836135871245dd9c04f295aef602311da1591d262ecb4d2f45c7a88003d",
              ],
              fromBlock: numberToRpcQuantity(10721019),
              toBlock: numberToRpcQuantity(10721019),
            },
          ]);

          assert.lengthOf(logs, 1);
          assert.isDefined(logs[0].logIndex);
          assert.isNotNull(logs[0].logIndex);
        });
      });

      describe("eth_getProof", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getProof");
        });
      });

      describe("eth_getStorageAt", async function () {
        describe("Imitating Ganache", function () {
          describe("When a slot has not been written into", function () {
            it("Should return `0x0000000000000000000000000000000000000000000000000000000000000000`", async function () {
              const exampleContract = await deployContract(
                this.provider,
                `0x${EXAMPLE_CONTRACT.bytecode.object}`
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcQuantity(3),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcQuantity(4),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  DEFAULT_ACCOUNTS_ADDRESSES[0],
                  numberToRpcQuantity(0),
                ]),
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              );
            });
          });

          describe("When a slot has been written into", function () {
            describe("When 32 bytes were written", function () {
              it("Should return a 32-byte DATA string", async function () {
                const firstBlock = await getFirstBlock();
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    numberToRpcQuantity(firstBlock),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    "latest",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );
              });

              it("Should return a 32-byte DATA string in the context of a new block with 'pending' block tag param", async function () {
                const snapshotId = await this.provider.send("evm_snapshot");
                const contractAddress = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                await this.provider.send("evm_revert", [snapshotId]);
                await this.provider.send("evm_setAutomine", [false]);

                const txHash = await this.provider.send("eth_sendTransaction", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
                    gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
                  },
                ]);
                const txReceipt = await this.provider.send(
                  "eth_getTransactionReceipt",
                  [txHash]
                );

                assert.isNotNull(contractAddress);
                assert.isNull(txReceipt);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    contractAddress,
                    numberToRpcQuantity(2),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    contractAddress,
                    numberToRpcQuantity(2),
                    "pending",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );
              });

              it("Should return a zero-value 32-byte DATA string in the context of the first block with 'earliest' block tag param", async function () {
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    "latest",
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    "earliest",
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );
              });
            });

            describe("When less than 32 bytes where written", function () {
              it("Should return a DATA string with the same amount bytes that have been written", async function () {
                const firstBlock = await getFirstBlock();
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                // We return as the EthereumJS VM stores it. This has been checked
                // against remix

                let newState =
                  "000000000000000000000000000000000000000000000000000000000000007b";

                await this.provider.send("eth_sendTransaction", [
                  {
                    to: exampleContract,
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
                  },
                ]);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                    numberToRpcQuantity(firstBlock + 1),
                  ]),
                  "0x0000000000000000000000000000000000000000000000000000000000000000"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007b"
                );

                newState =
                  "000000000000000000000000000000000000000000000000000000000000007c";

                await this.provider.send("eth_sendTransaction", [
                  {
                    to: exampleContract,
                    from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                    data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
                  },
                ]);

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                    numberToRpcQuantity(firstBlock + 2),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007b"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                  ]),
                  "0x000000000000000000000000000000000000000000000000000000000000007c"
                );
              });
            });
          });
        });
      });

      describe("eth_getTransactionByBlockHashAndIndex", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              "0x1231231231231231231231231231231231231231231231231231231231231231",
              numberToRpcQuantity(0),
            ])
          );
        });

        it("should return null for existing blocks but non-existing indexes", async function () {
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(0),
            false,
          ]);

          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              block.hash,
              numberToRpcQuantity(0),
            ])
          );

          assert.isNull(
            await this.provider.send("eth_getTransactionByBlockHashAndIndex", [
              block.hash,
              numberToRpcQuantity(0),
            ])
          );
        });

        it("should return the right info for the existing ones", async function () {
          const firstBlock = await getFirstBlock();
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block.hash, numberToRpcQuantity(0)]
          );

          assertTransaction(
            tx,
            txHash,
            txParams1,
            firstBlock + 1,
            block.hash,
            0
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: new BN(1),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block2.hash, numberToRpcQuantity(0)]
          );

          assertTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlock + 2,
            block2.hash,
            0
          );
        });
      });

      describe("eth_getTransactionByBlockNumberAndIndex", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(1), numberToRpcQuantity(0)]
            )
          );
        });

        it("should return null for existing blocks but non-existing indexes", async function () {
          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(0), numberToRpcQuantity(0)]
            )
          );

          assert.isNull(
            await this.provider.send(
              "eth_getTransactionByBlockNumberAndIndex",
              [numberToRpcQuantity(1), numberToRpcQuantity(0)]
            )
          );
        });

        it("should return the right info for the existing ones", async function () {
          const firstBlock = await getFirstBlock();
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 1), numberToRpcQuantity(0)]
          );

          assertTransaction(
            tx,
            txHash,
            txParams1,
            firstBlock + 1,
            block.hash,
            0
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: new BN(1),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(firstBlock + 2), numberToRpcQuantity(0)]
          );

          assertTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlock + 2,
            block2.hash,
            0
          );
        });

        it("should return the right transaction info when called with 'pending' block tag param", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            ["pending", numberToRpcQuantity(0)]
          );

          await this.provider.send("evm_mine");

          await sendTxToZeroAddress(
            this.provider,
            DEFAULT_ACCOUNTS_ADDRESSES[1]
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: new BN(2),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            ["pending", numberToRpcQuantity(1)]
          );

          assertTransaction(tx, txHash, txParams1);
          assertTransaction(tx2, txHash2, txParams2);
        });
      });

      describe("eth_getTransactionByHash", async function () {
        it("should return null for unknown txs", async function () {
          assert.isNull(
            await this.provider.send("eth_getTransactionByHash", [
              "0x1234567890123456789012345678901234567890123456789012345678902134",
            ])
          );

          assert.isNull(
            await this.provider.send("eth_getTransactionByHash", [
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ])
          );
        });

        it("should return the right info for the existing ones", async function () {
          const firstBlock = await getFirstBlock();
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(23912),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assertTransaction(
            tx,
            txHash,
            txParams1,
            firstBlock + 1,
            block.hash,
            0
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: new BN(1),
            value: new BN(123),
            gasLimit: new BN(80000),
            gasPrice: new BN(239),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash2]
          );

          assertTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlock + 2,
            block2.hash,
            0
          );
        });

        it("should return the transaction if it gets to execute and failed", async function () {
          const firstBlock = await getFirstBlock();
          const txParams: TransactionParams = {
            to: undefined,
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0x60006000fd"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(250000),
            gasPrice: new BN(23912),
          };

          const txHash = await getSignedTxHash(
            this.hardhatNetworkProvider,
            txParams,
            1
          );

          // Revert. This is a deployment transaction that immediately reverts without a reason
          await assertTransactionFailure(
            this.provider,
            {
              from: bufferToHex(txParams.from),
              data: bufferToHex(txParams.data),
              nonce: numberToRpcQuantity(txParams.nonce),
              value: numberToRpcQuantity(txParams.value),
              gas: numberToRpcQuantity(txParams.gasLimit),
              gasPrice: numberToRpcQuantity(txParams.gasPrice),
            },
            "Transaction reverted without a reason"
          );

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);
          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assertTransaction(
            tx,
            txHash,
            txParams,
            firstBlock + 1,
            block.hash,
            0
          );
        });

        it("should return the right properties", async function () {
          const address = "0x738a6fe8b5034a10e85f19f2abdfd5ed4e12463e";
          const privateKey = Buffer.from(
            "17ade313db5de97d19b4cfbc820d15e18a6c710c1afbf01c1f31249970d3ae46",
            "hex"
          );

          // send eth to the account that will sign the tx
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: address,
              value: "0x16345785d8a0000",
              gas: numberToRpcQuantity(21000),
            },
          ]);

          // create and send signed tx
          const common = Common.forCustomChain(
            "mainnet",
            {
              chainId: DEFAULT_CHAIN_ID,
              networkId: DEFAULT_NETWORK_ID,
              name: "hardhat",
            },
            "muirGlacier"
          );

          const tx = new Transaction(
            {
              nonce: "0x00",
              gasPrice: "0x2",
              gasLimit: "0x55f0",
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x1",
              data: "0xbeef",
            },
            {
              common,
            }
          );

          const signedTx = tx.sign(privateKey);

          const rawTx = `0x${signedTx.serialize().toString("hex")}`;

          const txHash = await this.provider.send("eth_sendRawTransaction", [
            rawTx,
          ]);

          const fetchedTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(fetchedTx.from, address);
          assert.equal(fetchedTx.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
          assert.equal(fetchedTx.value, "0x1");
          assert.equal(fetchedTx.nonce, "0x0");
          assert.equal(fetchedTx.gas, "0x55f0");
          assert.equal(fetchedTx.gasPrice, "0x2");
          assert.equal(fetchedTx.input, "0xbeef");

          // tx.v is padded but fetchedTx.v is not, so we need to do this
          const fetchedTxV = new BN(toBuffer(fetchedTx.v));
          const expectedTxV = new BN(signedTx.v!);
          assert.isTrue(fetchedTxV.eq(expectedTxV));

          // Also equalize left padding (signedTx has a leading 0)
          assert.equal(
            toBuffer(fetchedTx.r).toString("hex"),
            toBuffer(signedTx.r!).toString("hex")
          );

          assert.equal(
            toBuffer(fetchedTx.s).toString("hex"),
            toBuffer(signedTx.s!).toString("hex")
          );
        });

        it("should return the right info for the pending transaction", async function () {
          const txParams: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(25000),
            gasPrice: new BN(23912),
          };

          await this.provider.send("evm_setAutomine", [false]);

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assertTransaction(tx, txHash, txParams);
        });

        it("should get an existing transaction from mainnet", async function () {
          if (!isFork) {
            this.skip();
          }

          const tx = await this.provider.send("eth_getTransactionByHash", [
            "0x5a4bf6970980a9381e6d6c78d96ab278035bbff58c383ffe96a0a2bbc7c02a4b",
          ]);

          assert.equal(tx.from, "0x8a9d69aa686fa0f9bbdec21294f67d4d9cfb4a3e");
        });

        it("should get an existing transaction from rinkeby", async function () {
          const { ALCHEMY_URL } = process.env;
          if (!isFork || ALCHEMY_URL === undefined || ALCHEMY_URL === "") {
            this.skip();
          }
          const rinkebyUrl = ALCHEMY_URL.replace("mainnet", "rinkeby");

          // If "mainnet" is not present the replacement failed so we skip the test
          if (rinkebyUrl === ALCHEMY_URL) {
            this.skip();
          }

          await this.provider.send("hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: rinkebyUrl,
              },
            },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            "0x9f8322fbfc0092c0493d4421626e682a0ef0a56ea37efe8f29cda804cca92e7f",
          ]);

          assert.equal(tx.from, "0xbc3109d75dffaae85ef595902e3bd70fe0643b3b");
        });
      });

      describe("eth_getTransactionCount", async function () {
        it("Should return 0 for random accounts", async function () {
          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              zeroAddress(),
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              "0x0000000000000000000000000000000000000001",
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              "0x0001231287316387168230000000000000000001",
            ]),
            0
          );
        });

        it("Should return the updated count after a transaction is made", async function () {
          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            0
          );

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            1
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[2],
            ]),
            0
          );

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[2],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            1
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[2],
            ]),
            1
          );
        });

        it("Should not be affected by calls", async function () {
          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            0
          );

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            0
          );
        });

        it("Should leverage block tag parameter", async function () {
          const firstBlock = await getFirstBlock();
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
            },
          ]);

          if (!isFork) {
            assertQuantity(
              await this.provider.send("eth_getTransactionCount", [
                DEFAULT_ACCOUNTS_ADDRESSES[1],
                "earliest",
              ]),
              0
            );
          }

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              numberToRpcQuantity(firstBlock),
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              "latest",
            ]),
            1
          );
        });

        it("Should return transaction count in context of a new block with 'pending' block tag param", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              "latest",
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              "pending",
            ]),
            1
          );
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_getTransactionCount",
            [randomAddress().toString(), numberToRpcQuantity(futureBlock)],
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
          );
        });
      });

      describe("eth_getTransactionReceipt", async function () {
        it("should return null for unknown txs", async function () {
          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [
              "0x1234567876543234567876543456765434567aeaeaed67616732632762762373",
            ]
          );

          assert.isNull(receipt);
        });

        it("should return the right values for successful txs", async function () {
          const firstBlock = await getFirstBlock();
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
            },
          ]);

          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(firstBlock + 2), false]
          );

          const receipt: RpcReceiptOutput = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          assert.equal(receipt.blockHash, block.hash);
          assertQuantity(receipt.blockNumber, firstBlock + 2);
          assert.isNull(receipt.contractAddress);
          assert.equal(receipt.cumulativeGasUsed, receipt.gasUsed);
          assert.equal(receipt.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
          assertQuantity(receipt.status, 1);
          assert.equal(receipt.logs.length, 1);
          assert.equal(receipt.to, contractAddress);
          assert.equal(receipt.transactionHash, txHash);
          assertQuantity(receipt.transactionIndex, 0);

          const log = receipt.logs[0];

          assert.isFalse(log.removed);
          assertQuantity(log.logIndex, 0);
          assertQuantity(log.transactionIndex, 0);
          assert.equal(log.transactionHash, txHash);
          assert.equal(log.blockHash, block.hash);
          assertQuantity(log.blockNumber, firstBlock + 2);
          assert.equal(log.address, contractAddress);

          // The new value of i is not indexed
          assert.equal(
            log.data,
            "0x000000000000000000000000000000000000000000000000000000000000000a"
          );

          assert.deepEqual(log.topics, [
            EXAMPLE_CONTRACT.topics.StateModified[0],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ]);
        });

        it("should return the receipt for txs that were executed and failed", async function () {
          const txParams: TransactionParams = {
            to: undefined,
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0x60006000fd"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(250000),
            gasPrice: new BN(23912),
          };

          const txHash = await getSignedTxHash(
            this.hardhatNetworkProvider,
            txParams,
            1
          );

          // Revert. This is a deployment transaction that immediately reverts without a reason
          await assertTransactionFailure(
            this.provider,
            {
              from: bufferToHex(txParams.from),
              data: bufferToHex(txParams.data),
              nonce: numberToRpcQuantity(txParams.nonce),
              value: numberToRpcQuantity(txParams.value),
              gas: numberToRpcQuantity(txParams.gasLimit),
              gasPrice: numberToRpcQuantity(txParams.gasPrice),
            },
            "Transaction reverted without a reason"
          );

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          assert.isNotNull(receipt);
        });

        it("should return a new object every time", async function () {
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          const receipt1: RpcReceiptOutput = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          receipt1.blockHash = "changed";

          const receipt2: RpcReceiptOutput = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          assert.notEqual(receipt1, receipt2);
          assert.notEqual(receipt2.blockHash, "changed");
        });
      });

      describe("eth_getUncleByBlockHashAndIndex", async function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleByBlockHashAndIndex"
          );
        });
      });

      describe("eth_getUncleByBlockNumberAndIndex", async function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleByBlockNumberAndIndex"
          );
        });
      });

      describe("eth_getUncleCountByBlockHash", async function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleCountByBlockHash"
          );
        });
      });

      describe("eth_getUncleCountByBlockNumber", async function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleCountByBlockNumber"
          );
        });
      });

      describe("eth_getWork", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getWork");
        });
      });

      describe("eth_hashrate", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_hashrate");
        });
      });

      describe("eth_mining", async function () {
        it("should return false", async function () {
          assert.deepEqual(await this.provider.send("eth_mining"), false);
        });
      });

      describe("eth_newPendingTransactionFilter", async function () {
        it("Supports pending transaction filter", async function () {
          assert.isString(
            await this.provider.send("eth_newPendingTransactionFilter")
          );
        });

        it("Supports uninstalling an existing filter", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Should return new pending transactions", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);
          const txHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNotEmpty(txHashes);
        });

        it("Should not return new pending transactions after uninstall", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );

          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);
          const txHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNull(txHashes);
        });
      });

      describe("eth_pendingTransactions", async function () {
        it("should return an empty array if there are no pending transactions", async function () {
          assert.deepEqual(
            await this.provider.send("eth_pendingTransactions"),
            []
          );
        });

        it("should return an array of pending transactions", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          const txs = [];
          txs.push(
            await sendDummyTransaction(this.provider, 0, {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
            })
          );
          txs.push(
            await sendDummyTransaction(this.provider, 1, {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
            })
          );
          txs.push(
            await sendDummyTransaction(this.provider, 4, {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
            })
          );
          txs.push(
            await sendDummyTransaction(this.provider, 9, {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
            })
          );

          const pendingTransactions = await this.provider.send(
            "eth_pendingTransactions"
          );

          assert.lengthOf(pendingTransactions, 4);
          assert.sameOrderedMembers(
            pendingTransactions.map((tx: { hash: any }) => tx.hash),
            txs
          );
        });

        it("should return an array with remaining pending transactions after a block was mined", async function () {
          await this.provider.send("evm_setAutomine", [false]);

          await sendDummyTransaction(this.provider, 0, {
            from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          });
          await sendDummyTransaction(this.provider, 1, {
            from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          });

          const tx1 = await sendDummyTransaction(this.provider, 4, {
            from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          });
          const tx2 = await sendDummyTransaction(this.provider, 9, {
            from: DEFAULT_ACCOUNTS_ADDRESSES[1],
          });

          const pendingTransactionsBefore = await this.provider.send(
            "eth_pendingTransactions"
          );

          await this.provider.send("evm_mine");

          const pendingTransactionsAfter = await this.provider.send(
            "eth_pendingTransactions"
          );

          assert.notSameDeepOrderedMembers(
            pendingTransactionsAfter,
            pendingTransactionsBefore
          );
          assert.lengthOf(pendingTransactionsBefore, 4);
          assert.lengthOf(pendingTransactionsAfter, 2);
          assert.sameOrderedMembers(
            pendingTransactionsAfter.map((tx: { hash: any }) => tx.hash),
            [tx1, tx2]
          );
        });
      });

      describe("eth_protocolVersion", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_protocolVersion");
        });
      });

      describe("eth_sendRawTransaction", async function () {
        it("Should throw if the data isn't a proper transaction", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            ["0x223456"],
            "Invalid transaction"
          );
        });

        it("Should throw if the signature is invalid", async function () {
          if (isFork) {
            this.skip();
            return;
          }
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [
              // This transaction was obtained with eth_sendTransaction, and its r value was wiped
              "0xf3808501dcd6500083015f9080800082011a80a00dbd1a45b7823be518540ca77afb7178a470b8054281530a6cdfd0ad3328cf96",
            ],
            "Invalid Signature"
          );
        });

        it("Should throw if the signature is invalid but for another chain (EIP155)", async function () {
          if (isFork) {
            this.skip();
            return;
          }
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [
              "0xf86e820a0f843b9aca0083030d40941aad5e821c667e909c16a49363ca48f672b46c5d88169866e539efe0008025a07bc6a357d809c9d27f8f5a826861e7f9b4b7c9cff4f91f894b88e98212069b3da05dbadbdfa67bab1d76d2d81e33d90162d508431362331f266dd6aa0cb4b525aa",
            ],
            "Trying to send an incompatible EIP-155 transaction"
          );
        });

        it("Should send the raw transaction", async function () {
          if (isFork) {
            this.skip();
            return;
          }
          // This test is a copy of: Should work with just from and data

          const hash = await this.provider.send("eth_sendRawTransaction", [
            "0xf853808501dcd6500083015f9080800082011aa09c8def73818f79b6493b7a3f7ce47b557694ca195d1b54bb74e3d98990041b44a00dbd1a45b7823be518540ca77afb7178a470b8054281530a6cdfd0ad3328cf96",
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [hash]
          );

          const receiptFromGeth = {
            blockHash:
              "0x01490da2af913e9a868430b7b4c5060fc29cbdb1692bb91d3c72c734acd73bc8",
            blockNumber: "0x6",
            contractAddress: "0x6ea84fcbef576d66896dc2c32e139b60e641170c",
            cumulativeGasUsed: "0xcf0c",
            from: "0xda4585f6e68ed1cdfdad44a08dbe3979ec74ad8f",
            gasUsed: "0xcf0c",
            logs: [],
            logsBloom:
              "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            status: "0x1",
            to: null,
            transactionHash:
              "0xbd24cbe9c1633b98e61d93619230341141d2cff49470ed6afa739cee057fd0aa",
            transactionIndex: "0x0",
          };

          assertReceiptMatchesGethOne(receipt, receiptFromGeth, 1);
        });

        it("Should return the hash of the failed transaction", async function () {
          if (!isJsonRpc || isFork) {
            this.skip();
          }

          try {
            // sends a tx with 21000 gas to the 0x1 precompile
            await this.provider.send("eth_sendRawTransaction", [
              "0xf8618001825208940000000000000000000000000000000000000001808082011aa03e2b434ea8994b24017a30d58870e7387a69523b25f153f0d90411a8af8343d6a00c26d36e92d8a8334193b02982ce0b2ec9afc85ad26eaf8c2993ad07d3495f95",
            ]);

            assert.fail("Tx should have failed");
          } catch (e) {
            assert.notInclude(e.message, "Tx should have failed");

            assert.isDefined(e.data.txHash);
          }
        });
      });

      describe("eth_sendTransaction", async function () {
        // Because of the way we are testing this (i.e. integration testing) it's almost impossible to
        // fully test this method in a reasonable amount of time. This is because it executes the core
        // of Ethereum: its state transition function.
        //
        // We have mostly test about logic added on top of that, and will add new ones whenever
        // suitable. This is approximately the same as assuming that @ethereumjs/vm is correct, which
        // seems reasonable, and if it weren't we should address the issues there.

        describe("Params validation", function () {
          it("Should fail for tx sent from account that is neither local nor marked as impersonated", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: zeroAddress(),
                to: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
              "unknown account",
              InvalidInputError.CODE
            );
          });

          it("Should fail if sending to the null address without data", async function () {
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );

            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );

            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: "0x",
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
              "contract creation without any data provided",
              InvalidInputError.CODE
            );
          });
        });

        describe("when automine is enabled", () => {
          it("Should return a valid transaction hash", async function () {
            const hash = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.match(hash, /^0x[a-f\d]{64}$/);
          });

          it("Should work with just from and data", async function () {
            const firstBlock = await getFirstBlock();
            const hash = await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: "0x00",
              },
            ]);

            const receipt = await this.provider.send(
              "eth_getTransactionReceipt",
              [hash]
            );

            const receiptFromGeth = {
              blockHash:
                "0x01490da2af913e9a868430b7b4c5060fc29cbdb1692bb91d3c72c734acd73bc8",
              blockNumber: "0x6",
              contractAddress: "0x6ea84fcbef576d66896dc2c32e139b60e641170c",
              cumulativeGasUsed: "0xcf0c",
              from: "0xda4585f6e68ed1cdfdad44a08dbe3979ec74ad8f",
              gasUsed: "0xcf0c",
              logs: [],
              logsBloom:
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
              status: "0x1",
              to: null,
              transactionHash:
                "0xbd24cbe9c1633b98e61d93619230341141d2cff49470ed6afa739cee057fd0aa",
              transactionIndex: "0x0",
            };

            assertReceiptMatchesGethOne(
              receipt,
              receiptFromGeth,
              firstBlock + 1
            );
          });

          it("Should throw if the tx nonce is higher than the account nonce", async function () {
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(1),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too high. Expected nonce to be 0 but got 1. Note that transactions can't be queued when automining."
            );
          });

          it("Should throw if the tx nonce is lower than the account nonce", async function () {
            await sendTxToZeroAddress(
              this.provider,
              DEFAULT_ACCOUNTS_ADDRESSES[1]
            );
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(0),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too low. Expected nonce to be 1 but got 0."
            );
          });

          it("Should throw if the transaction fails", async function () {
            // Not enough gas
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(1),
                },
              ],
              "Transaction requires at least 21000 gas but got 1"
            );

            // Not enough balance
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(21000),
                  gasPrice: numberToRpcQuantity(DEFAULT_ACCOUNTS_BALANCES[0]),
                },
              ],
              "sender doesn't have enough funds to send tx"
            );

            // Gas is larger than block gas limit
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: zeroAddress(),
                  gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT + 1),
                },
              ],
              `Transaction gas limit is ${
                DEFAULT_BLOCK_GAS_LIMIT + 1
              } and exceeds block gas limit of ${DEFAULT_BLOCK_GAS_LIMIT}`
            );

            // Invalid opcode. We try to deploy a contract with an invalid opcode in the deployment code
            // The transaction gets executed anyway, so the account is updated
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0xAA",
              },
              "Transaction reverted without a reason"
            );

            // Out of gas. This a deployment transaction that pushes 0x00 multiple times
            // The transaction gets executed anyway, so the account is updated.
            //
            // Note: this test is pretty fragile, as the tx needs to have enough gas
            // to pay for the calldata, but not enough to execute. This costs changed
            // with istanbul, and may change again in the future.
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data:
                  "0x6000600060006000600060006000600060006000600060006000600060006000600060006000600060006000600060006000",
                gas: numberToRpcQuantity(53500),
              },
              "out of gas"
            );

            // Revert. This is a deployment transaction that immediately reverts without a reason
            // The transaction gets executed anyway, so the account is updated
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data: "0x60006000fd",
              },
              "Transaction reverted without a reason"
            );

            // This is a contract that reverts with A in its constructor
            await assertTransactionFailure(
              this.provider,
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                data:
                  "0x6080604052348015600f57600080fd5b506040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260018152602001807f410000000000000000000000000000000000000000000000000000000000000081525060200191505060405180910390fdfe",
              },
              "revert A"
            );
          });

          describe("when there are pending transactions in the mempool", () => {
            describe("when the sent transaction fits in the first block", () => {
              it("Should throw if the sender doesn't have enough balance as a result of mining pending transactions first", async function () {
                const firstBlock = await getFirstBlock();
                const wholeAccountBalance = numberToRpcQuantity(
                  DEFAULT_ACCOUNTS_BALANCES[0].subn(21_000)
                );
                await this.provider.send("evm_setAutomine", [false]);
                await this.provider.send("eth_sendTransaction", [
                  {
                    from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                    to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                    nonce: numberToRpcQuantity(0),
                    gas: numberToRpcQuantity(21000),
                    gasPrice: numberToRpcQuantity(1),
                    value: wholeAccountBalance,
                  },
                ]);
                await this.provider.send("evm_setAutomine", [true]);

                await assertInvalidInputError(
                  this.provider,
                  "eth_sendTransaction",
                  [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(1),
                      value: wholeAccountBalance,
                    },
                  ],
                  "sender doesn't have enough funds to send tx"
                );
                assert.equal(
                  rpcQuantityToNumber(
                    await this.provider.send("eth_blockNumber")
                  ),
                  firstBlock
                );
                assert.lengthOf(
                  await this.provider.send("eth_pendingTransactions"),
                  1
                );
              });
            });

            describe("when multiple blocks have to be mined before the sent transaction is included", () => {
              beforeEach(async function () {
                await this.provider.send("evm_setBlockGasLimit", [
                  numberToRpcQuantity(45000),
                ]);
              });

              it("Should eventually mine the sent transaction", async function () {
                await this.provider.send("evm_setAutomine", [false]);
                const blockNumberBefore = rpcQuantityToNumber(
                  await this.provider.send("eth_blockNumber")
                );

                await sendDummyTransaction(this.provider, 0, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 1, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 2, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await sendDummyTransaction(this.provider, 3, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });
                await this.provider.send("evm_setAutomine", [true]);
                const txHash = await sendDummyTransaction(this.provider, 4, {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                });

                const blockAfter = await this.provider.send(
                  "eth_getBlockByNumber",
                  ["latest", false]
                );
                const blockNumberAfter = rpcQuantityToNumber(blockAfter.number);

                assert.equal(blockNumberAfter, blockNumberBefore + 3);
                assert.lengthOf(blockAfter.transactions, 1);
                assert.sameDeepMembers(blockAfter.transactions, [txHash]);
              });

              it("Should throw if the sender doesn't have enough balance as a result of mining pending transactions first", async function () {
                const sendTransaction = async (
                  nonce: number,
                  value: BN | number
                ) => {
                  return this.provider.send("eth_sendTransaction", [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      nonce: numberToRpcQuantity(nonce),
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(1),
                      value: numberToRpcQuantity(value),
                    },
                  ]);
                };
                const initialBalance = DEFAULT_ACCOUNTS_BALANCES[1];
                const firstBlock = await getFirstBlock();

                await this.provider.send("evm_setAutomine", [false]);
                await sendTransaction(0, 0);
                await sendTransaction(1, 0);
                await sendTransaction(2, initialBalance.subn(3 * 21_000));

                await this.provider.send("evm_setAutomine", [true]);

                await assertInvalidInputError(
                  this.provider,
                  "eth_sendTransaction",
                  [
                    {
                      from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                      to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                      gas: numberToRpcQuantity(21000),
                      gasPrice: numberToRpcQuantity(1),
                      value: numberToRpcQuantity(100),
                    },
                  ],
                  "sender doesn't have enough funds to send tx"
                );
                assert.equal(
                  rpcQuantityToNumber(
                    await this.provider.send("eth_blockNumber")
                  ),
                  firstBlock
                );
                assert.lengthOf(
                  await this.provider.send("eth_pendingTransactions"),
                  3
                );
              });
            });
          });
        });

        describe("when automine is disabled", () => {
          beforeEach(async function () {
            await this.provider.send("evm_setAutomine", [false]);
          });

          it("Should not throw if the tx nonce is higher than the account nonce", async function () {
            await assert.isFulfilled(
              this.provider.send("eth_sendTransaction", [
                {
                  nonce: numberToRpcQuantity(1),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ])
            );
          });

          it("Should throw if the tx nonce is lower than the account nonce", async function () {
            await sendTxToZeroAddress(
              this.provider,
              DEFAULT_ACCOUNTS_ADDRESSES[1]
            );
            await assertInvalidInputError(
              this.provider,
              "eth_sendTransaction",
              [
                {
                  nonce: numberToRpcQuantity(0),
                  from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                  to: DEFAULT_ACCOUNTS_ADDRESSES[2],
                },
              ],
              "Nonce too low. Expected nonce to be at least 1 but got 0."
            );
          });

          it("Should throw an error if the same transaction is sent twice", async function () {
            const txParams = {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              nonce: numberToRpcQuantity(0),
            };

            const hash = await this.provider.send("eth_sendTransaction", [
              txParams,
            ]);

            await assertTransactionFailure(
              this.provider,
              txParams,
              `Known transaction: ${bufferToHex(hash)}`
            );
          });
        });

        describe("return txHash", () => {
          it("Should return the hash of an out of gas transaction", async function () {
            if (!isJsonRpc || isFork) {
              this.skip();
            }

            try {
              await this.provider.send("eth_sendTransaction", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: "0x0000000000000000000000000000000000000001",
                  gas: numberToRpcQuantity(21000), // Address 1 is a precompile, so this will OOG
                  gasPrice: numberToRpcQuantity(1),
                },
              ]);

              assert.fail("Tx should have failed");
            } catch (e) {
              assert.notInclude(e.message, "Tx should have failed");

              assert.isDefined(e.data.txHash);
            }
          });

          it("Should return the hash of a reverted transaction", async function () {
            if (!isJsonRpc || isFork) {
              this.skip();
            }

            try {
              const contractAddress = await deployContract(
                this.provider,
                `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
              );

              await this.provider.send("eth_sendTransaction", [
                {
                  to: contractAddress,
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  data: `${EXAMPLE_REVERT_CONTRACT.selectors.f}0000000000000000000000000000000000000000000000000000000000000000`,
                },
              ]);

              assert.fail("Tx should have failed");
            } catch (e) {
              assert.notInclude(e.message, "Tx should have failed");

              assert.isDefined(e.data.txHash);
            }
          });
        });

        // This test checks that an on-chain value can be set to 0
        // To do this, we transfer all the balance of the 0x0000...0001 account
        // to some random account, and then check that its balance is zero
        it("should set a value to 0", async function () {
          if (!isFork) {
            this.skip();
          }

          const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
          const sender = "0x0000000000000000000000000000000000000001";

          await this.provider.send("hardhat_impersonateAccount", [sender]);

          // get balance of 0x0000...0001
          const balanceBefore = await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: daiAddress,
              data:
                "0x70a082310000000000000000000000000000000000000000000000000000000000000001",
            },
          ]);

          // send out the full balance
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: daiAddress,
              data: `0xa9059cbb0000000000000000000000005a3fed996fc40791a26e7fb78dda4f9293788951${balanceBefore.slice(
                2
              )}`,
            },
          ]);

          const balanceAfter = await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: daiAddress,
              data:
                "0x70a082310000000000000000000000000000000000000000000000000000000000000001",
            },
          ]);

          assert.isTrue(new BN(toBuffer(balanceAfter)).isZero());
        });
      });

      describe("eth_sign", async function () {
        // TODO: Test this. Note that it's implementation is tested in one of
        // our provider wrappers, but re-test it here anyway.
      });

      describe("eth_signTransaction", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTransaction");
        });
      });

      describe("eth_signTypedData", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTypedData");
        });
      });

      describe("eth_signTypedData_v3", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTypedData_v3");
        });
      });

      describe("eth_signTypedData_v4", function () {
        // See https://eips.ethereum.org/EIPS/eip-712#parameters
        // There's a json schema and an explanation for each field.
        const typedMessage = {
          domain: {
            chainId: 31337,
            name: "Hardhat Network test suite",
          },
          message: {
            name: "Translation",
            start: {
              x: 200,
              y: 600,
            },
            end: {
              x: 300,
              y: 350,
            },
            cost: 50,
          },
          primaryType: "WeightedVector",
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "chainId", type: "uint256" },
            ],
            WeightedVector: [
              { name: "name", type: "string" },
              { name: "start", type: "Point" },
              { name: "end", type: "Point" },
              { name: "cost", type: "uint256" },
            ],
            Point: [
              { name: "x", type: "uint256" },
              { name: "y", type: "uint256" },
            ],
          },
        };
        const [address] = DEFAULT_ACCOUNTS_ADDRESSES;

        it("should sign a message", async function () {
          const signature = await this.provider.request({
            method: "eth_signTypedData_v4",
            params: [address, typedMessage],
          });
          const signedMessage = {
            data: typedMessage,
            sig: signature,
          };

          const recoveredAddress = recoverTypedSignature_v4(
            signedMessage as any
          );
          assert.equal(address.toLowerCase(), recoveredAddress.toLowerCase());
        });

        it("should sign a message that is JSON stringified", async function () {
          const signature = await this.provider.request({
            method: "eth_signTypedData_v4",
            params: [address, JSON.stringify(typedMessage)],
          });
          const signedMessage = {
            data: typedMessage,
            sig: signature,
          };

          const recoveredAddress = recoverTypedSignature_v4(
            signedMessage as any
          );
          assert.equal(address.toLowerCase(), recoveredAddress.toLowerCase());
        });

        it("should fail with an invalid JSON", async function () {
          try {
            const signature = await this.provider.request({
              method: "eth_signTypedData_v4",
              params: [address, "{an invalid JSON"],
            });
          } catch (error) {
            assert.include(error.message, "is an invalid JSON");
            return;
          }
          assert.fail("should have failed with an invalid JSON");
        });
      });

      describe("eth_submitHashrate", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_submitHashrate");
        });
      });

      describe("eth_submitWork", async function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_submitWork");
        });
      });

      describe("eth_subscribe", async function () {
        if (name === "JSON-RPC") {
          return;
        }

        function createFilterResultsGetter(
          ethereumProvider: EthereumProvider,
          filter: string
        ) {
          const notificationsResults: any[] = [];
          const notificationsListener = (payload: {
            subscription: string;
            result: any;
          }) => {
            if (filter === payload.subscription) {
              notificationsResults.push(payload.result);
            }
          };

          ethereumProvider.addListener("notifications", notificationsListener);

          const messageResults: any[] = [];
          const messageListener = (event: ProviderMessage) => {
            if (event.type === "eth_subscription") {
              const subscriptionMessage = event as EthSubscription;
              if (filter === subscriptionMessage.data.subscription) {
                messageResults.push(subscriptionMessage.data.result);
              }
            }
          };

          ethereumProvider.addListener("message", messageListener);

          let shouldUnsubscribe = true;

          return () => {
            if (shouldUnsubscribe) {
              ethereumProvider.removeListener(
                "notifications",
                notificationsListener
              );

              ethereumProvider.removeListener("message", messageListener);
              shouldUnsubscribe = false;
            }

            return {
              notificationsResults,
              messageResults,
            };
          };
        }

        it("Supports newHeads subscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newHeads",
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );

          assert.lengthOf(getResults().notificationsResults, 3);
          assert.lengthOf(getResults().messageResults, 3);
        });

        it("Supports newPendingTransactions subscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newPendingTransactions",
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          assert.lengthOf(getResults().notificationsResults, 1);
          assert.lengthOf(getResults().messageResults, 1);
        });

        it("Supports logs subscribe", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const filterId = await this.provider.send("eth_subscribe", [
            "logs",
            {
              address: exampleContract,
            },
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(getResults().notificationsResults, 1);
          assert.lengthOf(getResults().messageResults, 1);
        });
      });

      describe("eth_syncing", async function () {
        it("Should return false", async function () {
          assert.deepEqual(await this.provider.send("eth_syncing"), false);
        });
      });

      describe("eth_unsubscribe", async function () {
        it("Supports unsubscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newHeads",
          ]);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );
        });

        it("Doesn't fail when unsubscribe is called for a non-existent filter", async function () {
          assert.isFalse(await this.provider.send("eth_unsubscribe", ["0x1"]));
        });
      });

      describe("block tags", function () {
        it("should allow EIP-1898 block tags", async function () {
          const firstBlock = await getFirstBlock();

          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const previousBlockNumber = `0x${(firstBlock + 1).toString(16)}`;
          const previousBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [previousBlockNumber, false]
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockNumber: previousBlock.number,
              },
            ]),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockHash: previousBlock.hash,
              },
            ]),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          const latestBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockNumber: latestBlock.number,
              },
            ]),
            `0x${newState}`
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockHash: latestBlock.hash,
              },
            ]),
            `0x${newState}`
          );
        });

        it("should not accept an empty block tag", async function () {
          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {},
          ]);
        });

        it("should not accept both a blockNumber and a blockHash in a block tag", async function () {
          const latestBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {
              blockNumber: "0x0",
              blockHash: latestBlock.hash,
            },
          ]);
        });

        it("should not accept both a blockNumber and requireCanonical", async function () {
          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {
              blockNumber: "0x0",
              requireCanonical: true,
            },
          ]);
        });

        it("should accept a requireCanonical flag", async function () {
          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["0x0", false]
          );

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              {
                blockHash: block.hash,
                requireCanonical: true,
              },
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              {
                blockHash: block.hash,
                requireCanonical: false,
              },
            ]),
            0
          );
        });
      });

      describe("gas usage", function () {
        it("should use 17100 less gas when writing a non-zero slot", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_SETTER_CONTRACT.bytecode.object}`
          );

          const firstTxHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_SETTER_CONTRACT.selectors.setValue}0000000000000000000000000000000000000000000000000000000000000001`,
            },
          ]);

          const firstReceipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [firstTxHash]
          );

          const gasUsedBefore = new BN(toBuffer(firstReceipt.gasUsed));

          const secondTxHash = await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_SETTER_CONTRACT.selectors.setValue}0000000000000000000000000000000000000000000000000000000000000002`,
            },
          ]);

          const secondReceipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [secondTxHash]
          );

          const gasUsedAfter = new BN(toBuffer(secondReceipt.gasUsed));

          const gasDifference = gasUsedBefore.sub(gasUsedAfter);

          assert.equal(gasDifference.toString(), "17100");
        });
      });

      describe("receiptsRoot", function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("should have the right receiptsRoot when mining 1 tx", async function () {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assert.equal(
            block.receiptsRoot,
            "0x056b23fbba480696b65fe5a59b8f2148a1299103c4f57df839233af2cf4ca2d2"
          );
        });

        it("should have the right receiptsRoot when mining 2 txs", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          await this.provider.send("evm_mine", []);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assert.equal(
            block.receiptsRoot,
            "0xd95b673818fa493deec414e01e610d97ee287c9421c8eff4102b1647c1a184e4"
          );
        });
      });
    });
  });
});

describe("Eth module - hardfork dependant tests", function () {
  function useProviderAndCommon(hardfork: string) {
    importedUseProvider({ hardfork });
    beforeEach(async function () {
      // TODO: Find out a better way to obtain the common here

      // tslint:disable-next-line:no-string-literal
      await this.hardhatNetworkProvider["_init"]();
      // tslint:disable-next-line:no-string-literal
      this.common = this.hardhatNetworkProvider["_common"];
    });
  }

  const privateKey = Buffer.from(
    "17ade313db5de97d19b4cfbc820d15e18a6c710c1afbf01c1f31249970d3ae46",
    "hex"
  );

  function getSampleSignedTx(common?: Common) {
    if (common === undefined) {
      common = new Common({
        chain: "mainnet",
        hardfork: "spuriousDragon",
      });
    }

    const tx = Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 0,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  function getSampleSignedAccessListTx(common?: Common) {
    if (common === undefined) {
      common = new Common({
        chain: "mainnet",
        hardfork: "berlin",
      });
    }

    const tx = AccessListEIP2930Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 0,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  describe("Transaction, call and estimate gas validations", function () {
    describe("chain id validation", function () {
      describe("In a hardfork without access list but with EIP-155", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should validate the chain id if sent to eth_sendTransaction", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, chainId: numberToRpcQuantity(1) }],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id if an EIP-155 tx is sent with eth_sendRawTransaction", async function () {
          const signedTx = getSampleSignedTx();
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "signed for another chain"
          );
        });
      });

      describe("In a hardfork with access list", function () {
        useProviderAndCommon("berlin");

        it("Should validate the chain id if sent to eth_sendTransaction using access list", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [
              {
                from: sender,
                to: sender,
                chainId: numberToRpcQuantity(1),
                accessList: [],
              },
            ],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id in eth_sendRawTransaction using an access list tx", async function () {
          const signedTx = getSampleSignedAccessListTx();
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send a raw transaction with an invalid chainId"
          );
        });
      });
    });

    describe("Transaction type validation by hardfork", function () {
      describe("Without EIP155 nor access list", function () {
        useProviderAndCommon("tangerineWhistle");

        it("Should reject an eth_sendRawTransaction if signed with EIP-155", async function () {
          const spuriousDragonCommon = this.common.copy();
          spuriousDragonCommon.setHardfork("spuriousDragon");

          const signedTx = getSampleSignedTx(spuriousDragonCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-155 transaction"
          );
        });

        it("Should reject an eth_sendRawTransaction if the tx uses an access list", async function () {
          const berlinCommon = this.common.copy();
          berlinCommon.setHardfork("berlin");

          const signedTx = getSampleSignedAccessListTx(berlinCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-2930 transaction"
          );
        });

        it("Should reject an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });
      });

      describe("With EIP155 and not access list", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should accept an eth_sendRawTransaction if signed with EIP-155", async function () {
          const signedTx = getSampleSignedTx(this.common);
          const serialized = bufferToRpcData(signedTx.serialize());

          await this.provider.send("eth_sendRawTransaction", [serialized]);
        });

        it("Should reject an eth_sendRawTransaction if the tx uses an access list", async function () {
          const berlinCommon = this.common.copy();
          berlinCommon.setHardfork("berlin");

          const signedTx = getSampleSignedAccessListTx(berlinCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-2930 transaction"
          );
        });

        it("Should reject an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });
      });

      describe("With access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_sendRawTransaction if the tx uses an access list", async function () {
          const signedTx = getSampleSignedAccessListTx(this.common);
          const serialized = bufferToRpcData(signedTx.serialize());

          await this.provider.send("eth_sendRawTransaction", [serialized]);
        });

        it("Should accept an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: sender,
              accessList: [],
            },
          ]);
        });
      });
    });

    describe("Call and estimate gas types validation by hardfork", function () {
      describe("Without access list", function () {
        useProviderAndCommon("petersburg");

        it("Should reject an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_call",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });

        it("Should reject an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(this.provider, "eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });
      });

      describe("With access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_call", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });

        it("Should accept an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });
      });
    });
  });

  describe("Transaction and receipt output formatting", function () {
    describe("Transactions formatting", function () {
      describe("Before berlin", function () {
        useProviderAndCommon("petersburg");
        it("Should not include the fields type, chainId and accessList", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isUndefined(tx.type);
          assert.isUndefined(tx.chainId);
          assert.isUndefined(tx.accessList);
        });
      });

      describe("After berlin", function () {
        useProviderAndCommon("berlin");
        describe("legacy tx", function () {
          it("Should include the field type, but not chainId and accessList", async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              { from: sender, to: sender },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(0));
            assert.isUndefined(tx.chainId);
            assert.isUndefined(tx.accessList);
          });
        });

        describe("access list tx", function () {
          it("Should include the fields type,chainId and accessList", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [
                  "0x1111111111111111111111111111111111111111111111111111111111111111",
                ],
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(1));
            assert.equal(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, accessList);
          });

          it("Should accept access lists with null storageKeys", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: null,
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(1));
            assert.equal(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [],
              },
            ]);
          });
        });
      });

      // TODO: There's a case missing here, which is forking from Berlin but choosing the local hardfork to be < Berlin.
      //  In that case only remote EIP-2930 txs should have a type.
    });

    describe("Receipts formatting", function () {
      describe("Before byzantium", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should have a root field, and shouldn't have a status one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.root);
          assert.isUndefined(receipt.status);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After byzantium, before berlin", function () {
        useProviderAndCommon("byzantium");

        it("Should have a status field and not a root one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After berlin", function () {
        useProviderAndCommon("berlin");

        it("Should have status and type fields and not a root one", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.equal(receipt.type, "0x0");
        });
      });
    });
  });

  describe("Impersonated accounts", function () {
    useProviderAndCommon("berlin");

    it("should allow sending access list txs from impersonated accounts", async function () {
      // impersonate and add funds to some account
      const impersonated = "0x462B1B252FC8e9A447807e4494b271844fBCDa10";
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: impersonated,
          value: numberToRpcQuantity(new BN("100000000000000000")),
        },
      ]);
      await this.provider.send("hardhat_impersonateAccount", [impersonated]);

      // send tx from impersonated account
      const txHash = await this.provider.send("eth_sendTransaction", [
        {
          from: impersonated,
          to: impersonated,
          accessList: [],
        },
      ]);

      const tx = await this.provider.send("eth_getTransactionByHash", [txHash]);

      assert.isDefined(tx.accessList);
      assert.isArray(tx.accessList);
    });
  });

  describe("Access list transactions", function () {
    useProviderAndCommon("berlin");

    // This contract is useful to test that an access list is being used.
    //
    // The way it works is by letting you control how much gas "test"
    // forwards to "write".
    //
    // If you don't provide the right access list, all the storage accesses that
    // "write" makes are cold, and hence more expensive. You can find the max
    // amount of gas that you can forward to "write" that makes it OOG in this case.
    // That OOG makes "test" revert.
    //
    // Now, if you do provide an access list, all the storage accesses are warm,
    // so cheaper. If you forward the same amount of gas to "write" than before,
    // but provide an access list, it won't OOG and "test" won't revert.
    //
    // pragma solidity 0.7.0;
    //
    // contract C {
    //     uint a = 1; uint b = 1; uint c = 1; uint d = 1; uint e = 1; uint f = 1; uint g = 1;
    //     uint h = 1; uint i = 1; uint j = 1; uint k = 1; uint l = 1; uint m = 1; uint n = 1;
    //
    //     function test(uint gasToForward) public {
    //         this.write{gas: gasToForward}();
    //     }
    //
    //     function write() public {
    //         a += 1; b += 1; c += 1; d += 1; e += 1; f += 1; g += 1;
    //         h += 1; i += 1; j += 1; k += 1; l += 1; m += 1; n += 1;
    //     }
    // }
    const TEST_CONTRACT_DEPLOYMENT_BYTECODE =
      "0x6080604052600160005560018055600160025560016003556001600455600160055560016006556001600755600160085560016009556001600a556001600b556001600c556001600d5534801561005557600080fd5b506101fc806100656000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806329e99f071461003b578063bcb4ab0e14610069575b600080fd5b6100676004803603602081101561005157600080fd5b8101908080359060200190929190505050610073565b005b6100716100d8565b005b3073ffffffffffffffffffffffffffffffffffffffff1663bcb4ab0e826040518263ffffffff1660e01b8152600401600060405180830381600088803b1580156100bc57600080fd5b5087f11580156100d0573d6000803e3d6000fd5b505050505050565b6001600080828254019250508190555060018060008282540192505081905550600160026000828254019250508190555060016003600082825401925050819055506001600460008282540192505081905550600160056000828254019250508190555060016006600082825401925050819055506001600760008282540192505081905550600160086000828254019250508190555060016009600082825401925050819055506001600a600082825401925050819055506001600b600082825401925050819055506001600c600082825401925050819055506001600d6000828254019250508190555056fea2646970667358221220f49d12643dee70a8cfde7a6346c0ca133768619dd2fb07c942e69d5c0433fe3b64736f6c63430007000033";
    const TEST_FUNCTION_SELECTOR = "0x29e99f07";
    const MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST = 70605;
    const WRITE_STORAGE_KEYS = [
      bufferToRpcData(toBuffer(0), 32),
      bufferToRpcData(toBuffer(1), 32),
      bufferToRpcData(toBuffer(2), 32),
      bufferToRpcData(toBuffer(3), 32),
      bufferToRpcData(toBuffer(4), 32),
      bufferToRpcData(toBuffer(5), 32),
      bufferToRpcData(toBuffer(6), 32),
      bufferToRpcData(toBuffer(7), 32),
      bufferToRpcData(toBuffer(8), 32),
      bufferToRpcData(toBuffer(9), 32),
      bufferToRpcData(toBuffer(10), 32),
      bufferToRpcData(toBuffer(11), 32),
      bufferToRpcData(toBuffer(12), 32),
      bufferToRpcData(toBuffer(13), 32),
    ];

    function abiEncodeUint(uint: number) {
      return new BN(uint).toBuffer("be", 32).toString("hex");
    }

    let contract: string;
    let txData: any;

    beforeEach(async function () {
      contract = await deployContract(
        this.provider,
        TEST_CONTRACT_DEPLOYMENT_BYTECODE
      );

      txData = {
        to: contract,
        data:
          TEST_FUNCTION_SELECTOR +
          abiEncodeUint(MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST),
        accessList: [
          {
            address: contract,
            storageKeys: WRITE_STORAGE_KEYS,
          },
        ],
      };
    });

    describe("Validate access list test contract", function () {
      it("Should revert if the max gas is forwarded", async function () {
        await assert.isRejected(
          this.provider.send("eth_call", [
            {
              ...txData,
              accessList: undefined,
            },
          ]),
          "reverted without a reason"
        );
      });

      it("Should not revert if the more gas is forwarded", async function () {
        await this.provider.send("eth_call", [
          {
            to: contract,
            data:
              TEST_FUNCTION_SELECTOR +
              abiEncodeUint(
                MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST + 1
              ),
          },
        ]);
      });
    });

    describe("eth_call", function () {
      it("should use the access list if sent", async function () {
        await this.provider.send("eth_call", [txData]);
      });
    });

    describe("eth_estimateGas", function () {
      it("should use the access list if sent", async function () {
        // It would revert and throw if the access list is not used
        await this.provider.send("eth_estimateGas", [txData]);
      });
    });

    describe("eth_sendRawTransaction", function () {
      it("should use the access list if an EIP-2930 tx is sent", async function () {
        const unsignedTx = AccessListEIP2930Transaction.fromTxData(
          { ...txData, gasPrice: 0, gasLimit: 1000000 },
          {
            common: this.common,
          }
        );

        const signedTx = unsignedTx.sign(privateKey);

        const txHash = await this.provider.send("eth_sendRawTransaction", [
          bufferToRpcData(signedTx.serialize()),
        ]);

        const tx = await this.provider.send("eth_getTransactionByHash", [
          txHash,
        ]);

        assert.equal(tx.type, numberToRpcQuantity(1));
      });
    });

    describe("eth_sendTransaction", function () {
      describe("When automining", function () {
        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(tx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(0) },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(tx.type, numberToRpcQuantity(1));
        });
      });

      describe("When txs go through the mempool", function () {
        beforeEach("Disable automining", async function () {
          await this.provider.send("evm_setAutomine", [false]);
        });

        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(minedTx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(0) },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(minedTx.type, numberToRpcQuantity(1));
        });
      });
    });
  });
});
