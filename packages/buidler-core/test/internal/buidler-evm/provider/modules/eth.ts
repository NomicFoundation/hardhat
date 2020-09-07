import { assert } from "chai";
import Common from "ethereumjs-common";
import { Transaction } from "ethereumjs-tx";
import {
  BN,
  bufferToHex,
  privateToAddress,
  toBuffer,
  zeroAddress,
} from "ethereumjs-util";

import { InvalidInputError } from "../../../../../src/internal/buidler-evm/provider/errors";
import {
  COINBASE_ADDRESS,
  TransactionParams,
} from "../../../../../src/internal/buidler-evm/provider/node";
import {
  numberToRpcQuantity,
  RpcBlockOutput,
  RpcLogOutput,
  RpcTransactionOutput,
  RpcTransactionReceiptOutput,
} from "../../../../../src/internal/buidler-evm/provider/output";
import { getCurrentTimestamp } from "../../../../../src/internal/buidler-evm/provider/utils";
import { EthereumProvider } from "../../../../../src/types";
import {
  assertInvalidInputError,
  assertNodeBalances,
  assertNotSupported,
  assertQuantity,
  assertReceiptMatchesGethOne,
  assertTransaction,
  assertTransactionFailure,
} from "../../helpers/assertions";
import {
  EXAMPLE_CONTRACT,
  EXAMPLE_READ_CONTRACT,
} from "../../helpers/contracts";
import { quantityToNumber } from "../../helpers/conversions";
import { setCWD } from "../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  PROVIDERS,
} from "../../helpers/useProvider";

const DEFAULT_ACCOUNTS_ADDRESSES = DEFAULT_ACCOUNTS.map((account) =>
  bufferToHex(privateToAddress(toBuffer(account.privateKey))).toLowerCase()
);

const DEFAULT_ACCOUNTS_BALANCES = DEFAULT_ACCOUNTS.map(
  (account) => account.balance
);

const PRECOMPILES_COUNT = 8;

async function sendTxToZeroAddress(
  provider: EthereumProvider
): Promise<string> {
  const accounts = await provider.send("eth_accounts");

  const burnTxParams = {
    from: accounts[0],
    to: zeroAddress(),
    value: numberToRpcQuantity(1),
    gas: numberToRpcQuantity(21000),
    gasPrice: numberToRpcQuantity(1),
  };

  return provider.send("eth_sendTransaction", [burnTxParams]);
}

async function deployContract(
  provider: EthereumProvider,
  deploymentCode: string
) {
  const hash = await provider.send("eth_sendTransaction", [
    {
      from: DEFAULT_ACCOUNTS_ADDRESSES[0],
      data: deploymentCode,
      gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
    },
  ]);

  const { contractAddress } = await provider.send("eth_getTransactionReceipt", [
    hash,
  ]);

  return contractAddress;
}

async function sendTransactionFromTxParams(
  provider: EthereumProvider,
  txParams: TransactionParams
) {
  return provider.send("eth_sendTransaction", [
    {
      to: bufferToHex(txParams.to),
      from: bufferToHex(txParams.from),
      data: bufferToHex(txParams.data),
      nonce: numberToRpcQuantity(txParams.nonce),
      value: numberToRpcQuantity(txParams.value),
      gas: numberToRpcQuantity(txParams.gasLimit),
      gasPrice: numberToRpcQuantity(txParams.gasPrice),
    },
  ]);
}

function getSignedTxHash(
  txParams: TransactionParams,
  signerAccountIndex: number
) {
  const txToSign = new Transaction(txParams, {
    common: Common.forCustomChain(
      "mainnet",
      { chainId: DEFAULT_CHAIN_ID },
      "istanbul"
    ),
  });

  txToSign.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

  return bufferToHex(txToSign.hash(true));
}

describe("Eth module", function () {
  PROVIDERS.forEach((provider) => {
    describe(`Provider ${provider.name}`, function () {
      setCWD();
      provider.useProvider();

      describe("eth_accounts", async function () {
        it("should return the genesis accounts in lower case", async function () {
          const accounts = await this.provider.send("eth_accounts");

          assert.deepEqual(accounts, DEFAULT_ACCOUNTS_ADDRESSES);
        });
      });

      describe("eth_blockNumber", async function () {
        it("should return the current block number as QUANTITY", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 0);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 1);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 2);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 3);
        });

        it("Shouldn increase if a transaction gets to execute and fails", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 0);

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
          assertQuantity(blockNumber, 1);
        });

        it("Shouldn't increase if a call is made", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 0);

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x0000000000000000000000000000000000000000",
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, 0);
        });
      });

      describe("eth_call", async function () {
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
        it("Should be run in the context of the last block with 'latest' param", async function () {
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

          assert.equal(
            blockResult,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );

          const timestampResult = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
            },
            "latest",
          ]);

          assert.equal(timestampResult, timestamp);
        });
        it("Should be run in the context of the last block with without block tag param", async function () {
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

          assert.equal(
            blockResult,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );

          const timestampResult = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
            },
          ]);

          assert.equal(timestampResult, timestamp);
        });
        it("Should be run in the context of a new block with 'pending' blog tag param", async function () {
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

          assert.equal(
            blockResult,
            "0x0000000000000000000000000000000000000000000000000000000000000002"
          );

          const timestampResult = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              data: EXAMPLE_READ_CONTRACT.selectors.blockTimestamp,
            },
            "pending",
          ]);

          assert.equal(timestampResult, timestamp);
        });
        it("Should return an empty buffer if called an non-contract account", async function () {
          const result = await this.provider.send("eth_call", [
            {
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.i,
            },
          ]);

          assert.equal(result, "0x");
        });

        it("Should leverage block number parameter", async function () {
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
              numberToRpcQuantity(1),
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
      });

      describe("eth_chainId", async function () {
        it("should return the chain id as QUANTITY", async function () {
          assertQuantity(
            await this.provider.send("eth_chainId"),
            this.common.chainId()
          );
        });
      });

      describe("eth_coinbase", async function () {
        it("should return the the hardcoded coinbase address", async function () {
          assert.equal(
            await this.provider.send("eth_coinbase"),
            bufferToHex(COINBASE_ADDRESS)
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

        it("should leverage block number parameter", async function () {
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
            numberToRpcQuantity(0),
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.isTrue(new BN(toBuffer(result)).lt(new BN(toBuffer(result2))));
        });
      });

      describe("eth_gasPrice", async function () {
        it("should return a fixed gas price", async function () {
          assertQuantity(await this.provider.send("eth_gasPrice"), 8e9);
        });
      });

      describe("eth_getBalance", async function () {
        it("Should return 0 for random accounts", async function () {
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

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              "0x0001231287316387168230000000000000000001",
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

        it("should leverage block number parameter", async function () {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: zeroAddress(),
              value: numberToRpcQuantity(1),
            },
          ]);

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              "earliest",
            ]),
            "0x0"
          );

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              numberToRpcQuantity(0),
            ]),
            "0x0"
          );

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              numberToRpcQuantity(1),
            ]),
            "0x1"
          );

          assert.strictEqual(
            await this.provider.send("eth_getBalance", [zeroAddress()]),
            "0x1"
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
          assertQuantity(block.number, 1);
          assert.equal(block.transactions.length, 1);
          assert.include(block.transactions as string[], txHash);
          assert.equal(block.miner, bufferToHex(COINBASE_ADDRESS));
          assert.isEmpty(block.uncles);
        });

        it("Should return the block with the complete transactions if the second argument is true", async function () {
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
          assertQuantity(block.number, 1);
          assert.equal(block.transactions.length, 1);
          assert.equal(block.miner, bufferToHex(COINBASE_ADDRESS));
          assert.deepEqual(
            block.transactions[0] as RpcTransactionOutput,
            txOutput
          );
          assert.isEmpty(block.uncles);
        });
      });

      describe("eth_getBlockByNumber", async function () {
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
            const block = await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(2),
              false,
            ]);

            assert.isNull(block);

            const block2 = await this.provider.send("eth_getBlockByNumber", [
              numberToRpcQuantity(1),
              true,
            ]);

            assert.isNull(block2);
          });

          it("Should return the new blocks", async function () {
            const genesisBlock: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              [numberToRpcQuantity(0), false]
            );

            const txHash = await sendTxToZeroAddress(this.provider);

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              [numberToRpcQuantity(1), false]
            );

            assertQuantity(block.number, 1);
            assert.equal(block.transactions.length, 1);
            assert.equal(block.parentHash, genesisBlock.hash);
            assert.include(block.transactions as string[], txHash);
            assert.equal(block.miner, bufferToHex(COINBASE_ADDRESS));
            assert.isEmpty(block.uncles);
          });

          it("should return the complete transactions if the second argument is true", async function () {
            const genesisBlock: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              [numberToRpcQuantity(0), false]
            );

            const txHash = await sendTxToZeroAddress(this.provider);

            const block: RpcBlockOutput = await this.provider.send(
              "eth_getBlockByNumber",
              [numberToRpcQuantity(1), true]
            );

            assertQuantity(block.number, 1);
            assert.equal(block.transactions.length, 1);
            assert.equal(block.parentHash, genesisBlock.hash);
            assert.equal(block.miner, bufferToHex(COINBASE_ADDRESS));
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

          it("should return the right block total difficulty", async function () {
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
              quantityToNumber(block.difficulty) + 1
            );
          });
        });
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
          assert.isNull(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(1),
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

        it("Should return 1 for others", async function () {
          await sendTxToZeroAddress(this.provider);

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(1),
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

        it("Should leverage block number parameter", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          assert.strictEqual(
            await this.provider.send("eth_getCode", [
              exampleContract,
              numberToRpcQuantity(0),
            ]),
            "0x"
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
          assert.equal(log.blockNumber, "0x2");
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
              fromBlock: "0x0",
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
              fromBlock: "0x0",
              toBlock: "0x2",
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
          assert.equal(log.blockNumber, "0x2");
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
                fromBlock: "0x2",
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
                fromBlock: "0x3",
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
                fromBlock: "0x0",
                toBlock: "0x2",
              },
            ]),
            1
          );
        });

        it("should accept out of bound block numbers", async function () {
          const logs = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              fromBlock: "0x1111",
            },
          ]);
          assert.lengthOf(logs, 0);

          const logs2 = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              toBlock: "0x1111",
            },
          ]);
          assert.lengthOf(logs2, 0);
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
            it("Should return `0x0`, despite it not making any sense at all", async function () {
              const exampleContract = await deployContract(
                this.provider,
                `0x${EXAMPLE_CONTRACT.bytecode.object}`
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcQuantity(3),
                ]),
                "0x0"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  exampleContract,
                  numberToRpcQuantity(4),
                ]),
                "0x0"
              );

              assert.strictEqual(
                await this.provider.send("eth_getStorageAt", [
                  DEFAULT_ACCOUNTS_ADDRESSES[0],
                  numberToRpcQuantity(0),
                ]),
                "0x0"
              );
            });
          });

          describe("When a slot has been written into", function () {
            describe("When 32 bytes where written", function () {
              it("Should return a 32-byte DATA string", async function () {
                const exampleContract = await deployContract(
                  this.provider,
                  `0x${EXAMPLE_CONTRACT.bytecode.object}`
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                    numberToRpcQuantity(0),
                  ]),
                  "0x0"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(2),
                  ]),
                  "0x1234567890123456789012345678901234567890123456789012345678901234"
                );
              });
            });

            describe("When less than 32 bytes where written", function () {
              it("Should return a DATA string with the same amount bytes that have been written", async function () {
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
                    numberToRpcQuantity(1),
                  ]),
                  "0x0"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                  ]),
                  "0x7b"
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
                    numberToRpcQuantity(2),
                  ]),
                  "0x7b"
                );

                assert.strictEqual(
                  await this.provider.send("eth_getStorageAt", [
                    exampleContract,
                    numberToRpcQuantity(0),
                  ]),
                  "0x7c"
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
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block.hash, numberToRpcQuantity(0)]
          );

          assertTransaction(tx, txHash, txParams1, 1, block.hash, 0);

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockHashAndIndex",
            [block2.hash, numberToRpcQuantity(0)]
          );

          assertTransaction(tx2, txHash2, txParams2, 2, block2.hash, 0);
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
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(1), numberToRpcQuantity(0)]
          );

          assertTransaction(tx, txHash, txParams1, 1, block.hash, 0);

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByBlockNumberAndIndex",
            [numberToRpcQuantity(2), numberToRpcQuantity(0)]
          );

          assertTransaction(tx2, txHash2, txParams2, 2, block2.hash, 0);
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
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(1),
            false,
          ]);

          const tx: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assertTransaction(tx, txHash, txParams1, 1, block.hash, 0);

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
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
            numberToRpcQuantity(2),
            false,
          ]);

          const tx2: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash2]
          );

          assertTransaction(tx2, txHash2, txParams2, 2, block2.hash, 0);
        });

        it("should return the transaction if it gets to execute and failed", async function () {
          const txParams: TransactionParams = {
            to: toBuffer([]),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
            data: toBuffer("0x60006000fd"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(250000),
            gasPrice: new BN(23912),
          };

          const txHash = getSignedTxHash(txParams, 0);

          // Revert. This a deployment transaction that immediately reverts without a reason
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
            numberToRpcQuantity(1),
            false,
          ]);

          assertTransaction(tx, txHash, txParams, 1, block.hash, 0);
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
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ]),
            0
          );

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ]),
            1
          );

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
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ]),
            1
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[1],
            ]),
            1
          );
        });

        it("Should not be affected by calls", async function () {
          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ]),
            0
          );

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
            ]),
            0
          );
        });

        it("Should leverage block number parameter", async function () {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
            },
          ]);

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
              "earliest",
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getTransactionCount", [
              DEFAULT_ACCOUNTS_ADDRESSES[0],
              "latest",
            ]),
            1
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
            [numberToRpcQuantity(2), false]
          );

          const receipt: RpcTransactionReceiptOutput = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          assert.equal(receipt.blockHash, block.hash);
          assertQuantity(receipt.blockNumber, 2);
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
          assertQuantity(log.blockNumber, 2);
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
            to: toBuffer([]),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[0]),
            data: toBuffer("0x60006000fd"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(250000),
            gasPrice: new BN(23912),
          };

          const txHash = getSignedTxHash(txParams, 0);

          // Revert. This a deployment transaction that immediately reverts without a reason
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
        it("should return an empty array, as there is no pending transactions support", async function () {
          assert.deepEqual(
            await this.provider.send("eth_pendingTransactions"),
            []
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
          await assertInvalidInputError(
            this.provider,
            "eth_sendRawTransaction",
            ["0x123456"],
            "Invalid transaction"
          );
        });

        it("Should throw if the signature is invalid", async function () {
          await assertInvalidInputError(
            this.provider,
            "eth_sendRawTransaction",
            [
              // This transaction was obtained with eth_sendTransaction, and its r value was wiped
              "0xf3808501dcd6500083015f9080800082011a80a00dbd1a45b7823be518540ca77afb7178a470b8054281530a6cdfd0ad3328cf96",
            ],
            "Invalid transaction signature"
          );
        });

        it("Should throw if the signature is invalid but for another chain (EIP155)", async function () {
          await assertInvalidInputError(
            this.provider,
            "eth_sendRawTransaction",
            [
              "0xf86e820a0f843b9aca0083030d40941aad5e821c667e909c16a49363ca48f672b46c5d88169866e539efe0008025a07bc6a357d809c9d27f8f5a826861e7f9b4b7c9cff4f91f894b88e98212069b3da05dbadbdfa67bab1d76d2d81e33d90162d508431362331f266dd6aa0cb4b525aa",
            ],
            "Incompatible EIP155-based"
          );
        });

        it("Should send the raw transaction", async function () {
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
      });

      describe("eth_sendTransaction", async function () {
        // Because of the way we are testing this (i.e. integration testing) it's almost impossible to
        // fully test this method in a reasonable amount of time. This is because it executes the core
        // of Ethereum: its state transition function.
        //
        // We have mostly test about logic added on top of that, and will add new ones whenever
        // suitable. This is approximately the same as assuming that ethereumjs-vm is correct, which
        // seems reasonable, and if it weren't we should address the issues there.

        describe("Params validation", function () {
          it("Should fail if the account is not managed by the provider", async function () {
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

        it("Should work with just from and data", async function () {
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

          assertReceiptMatchesGethOne(receipt, receiptFromGeth, 1);
        });

        it("Should throw if the transaction fails", async function () {
          // Not enough gas
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: zeroAddress(),
              gas: numberToRpcQuantity(1),
            },
            "Transaction requires at least 21000 gas but got 1"
          );

          // Not enough balance
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: zeroAddress(),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(DEFAULT_ACCOUNTS_BALANCES[0]),
            },
            "sender doesn't have enough funds to send tx"
          );

          // Gas is larger than block gas limit
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: zeroAddress(),
              gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT + 1),
            },
            `Transaction gas limit is ${
              DEFAULT_BLOCK_GAS_LIMIT + 1
            } and exceeds block gas limit of ${DEFAULT_BLOCK_GAS_LIMIT}`
          );

          // Invalid opcode. We try to deploy a contract with an invalid opcode in the deployment code
          // The transaction gets executed anyway, so the account is updated
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
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
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data:
                "0x6000600060006000600060006000600060006000600060006000600060006000600060006000600060006000600060006000",
              gas: numberToRpcQuantity(53500),
            },
            "out of gas"
          );

          // Invalid nonce
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              nonce: numberToRpcQuantity(1),
            },
            "Invalid nonce. Expected 2 but got 1"
          );

          // Revert. This a deployment transaction that immediately reverts without a reason
          // The transaction gets executed anyway, so the account is updated
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: "0x60006000fd",
            },
            "Transaction reverted without a reason"
          );

          // This is a contract that reverts with A in its constructor
          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data:
                "0x6080604052348015600f57600080fd5b506040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260018152602001807f410000000000000000000000000000000000000000000000000000000000000081525060200191505060405180910390fdfe",
            },
            "revert A"
          );
        });

        it("Should fail if a successful tx is sent more than once", async function () {
          const hash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await assertTransactionFailure(
            this.provider,
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              nonce: numberToRpcQuantity(0),
            },
            `known transaction: ${bufferToHex(hash)}`
          );
        });

        it("should accept a failed transaction if it eventually becomes valid", async function () {
          const txParams = {
            from: DEFAULT_ACCOUNTS_ADDRESSES[0],
            to: DEFAULT_ACCOUNTS_ADDRESSES[0],
            nonce: numberToRpcQuantity(1),
          };

          // This transaction is invalid now, because of its nonce
          await assertTransactionFailure(this.provider, txParams);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              nonce: numberToRpcQuantity(0),
            },
          ]);

          // The transaction is now valid
          const hash = await this.provider.send("eth_sendTransaction", [
            txParams,
          ]);

          // It should throw now
          await assertTransactionFailure(
            this.provider,
            txParams,
            `known transaction: ${bufferToHex(hash)}`
          );
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

      describe("eth_signTypedData", async function () {
        // TODO: Test this. Note that it just forwards to/from eth-sign-util
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
        if (provider.name === "JSON-RPC") {
          return;
        }

        it("Supports newHeads subscribe", async function () {
          const heads: any[] = [];
          const filterId = await this.provider.send("eth_subscribe", [
            "newHeads",
          ]);

          const listener = (payload: { subscription: string; result: any }) => {
            if (filterId === payload.subscription) {
              heads.push(payload.result);
            }
          };

          this.provider.addListener("notifications", listener);

          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );

          assert.lengthOf(heads, 3);
        });

        it("Supports newPendingTransactions subscribe", async function () {
          const pendingTransactions: string[] = [];
          const filterId = await this.provider.send("eth_subscribe", [
            "newPendingTransactions",
          ]);

          const listener = (payload: { subscription: string; result: any }) => {
            if (filterId === payload.subscription) {
              pendingTransactions.push(payload.result);
            }
          };

          this.provider.addListener("notifications", listener);

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

          assert.lengthOf(pendingTransactions, 1);
        });

        it("Supports logs subscribe", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const logs: RpcLogOutput[] = [];
          const filterId = await this.provider.send("eth_subscribe", [
            "logs",
            {
              address: exampleContract,
            },
          ]);

          const listener = (payload: { subscription: string; result: any }) => {
            if (filterId === payload.subscription) {
              logs.push(payload.result);
            }
          };

          this.provider.addListener("notifications", listener);

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(logs, 1);
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
    });
  });
});
