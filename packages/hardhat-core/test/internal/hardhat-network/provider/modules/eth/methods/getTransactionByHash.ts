import { Common } from "@nomicfoundation/ethereumjs-common";
import { LegacyTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  bytesToHex as bufferToHex,
  setLengthLeft,
  toBytes,
  zeroAddress,
} from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToBigInt,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../src/internal/hardhat-network/provider/node-types";
import {
  AccessListEIP2930RpcTransactionOutput,
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
import { ALCHEMY_URL } from "../../../../../../setup";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertAccessListTransaction,
  assertEIP1559Transaction,
  assertLegacyTransaction,
  assertTransactionFailure,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import { getPendingBaseFeePerGas } from "../../../../helpers/getPendingBaseFeePerGas";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_CHAIN_ID,
  DEFAULT_NETWORK_ID,
  PROVIDERS,
} from "../../../../helpers/providers";
import {
  getSignedTxHash,
  sendTransactionFromTxParams,
} from "../../../../helpers/transactions";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

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
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const txParams1: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0xaa"),
            nonce: 0n,
            value: 123n,
            gasLimit: 25_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          const tx: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assertLegacyTransaction(
            tx,
            txHash,
            txParams1,
            firstBlockNumber + 1,
            block.hash,
            0
          );

          const txParams2: TransactionParams = {
            to: toBuffer(zeroAddress()),
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer([]),
            nonce: 1n,
            value: 123n,
            gasLimit: 80_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 2),
            false,
          ]);

          const tx2: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash2]
          );

          assertLegacyTransaction(
            tx2,
            txHash2,
            txParams2,
            firstBlockNumber + 2,
            block2.hash,
            0
          );
        });

        it("should return the transaction if it gets to execute and failed", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const txParams: TransactionParams = {
            to: undefined,
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            data: toBuffer("0x60006000fd"),
            nonce: 0n,
            value: 123n,
            gasLimit: 250_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
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
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          assertLegacyTransaction(
            tx,
            txHash,
            txParams,
            firstBlockNumber + 1,
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
              gasPrice: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);

          const common = Common.custom(
            {
              chainId: DEFAULT_CHAIN_ID,
              networkId: DEFAULT_NETWORK_ID,
            },
            {
              hardfork: "muirGlacier",
            }
          );

          const txParams = {
            nonce: "0x0",
            gasPrice: numberToRpcQuantity(
              await getPendingBaseFeePerGas(this.provider)
            ),
            gasLimit: "0x55f0",
            to: DEFAULT_ACCOUNTS_ADDRESSES[1],
            value: "0x1",
            data: "0xbeef",
          };

          const tx = new LegacyTransaction(txParams, { common });

          const signedTx = tx.sign(privateKey);

          const rawTx = `0x${Buffer.from(signedTx.serialize()).toString(
            "hex"
          )}`;

          const txHash = await this.provider.send("eth_sendRawTransaction", [
            rawTx,
          ]);

          const fetchedTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(fetchedTx.from, address);
          assert.equal(fetchedTx.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
          assert.equal(
            rpcQuantityToBigInt(fetchedTx.value),
            rpcQuantityToBigInt(txParams.value)
          );
          assert.equal(
            rpcQuantityToBigInt(fetchedTx.nonce),
            rpcQuantityToBigInt(txParams.nonce)
          );
          assert.equal(
            rpcQuantityToBigInt(fetchedTx.gas),
            rpcQuantityToBigInt(txParams.gasLimit)
          );
          assert.equal(
            rpcQuantityToBigInt(fetchedTx.gasPrice),
            rpcQuantityToBigInt(txParams.gasPrice)
          );
          assert.equal(fetchedTx.input, txParams.data);

          // tx.v is padded but fetchedTx.v is not, so we need to do this
          const fetchedTxV = BigInt(fetchedTx.v);
          const expectedTxV = BigInt(signedTx.v!);
          assert.equal(fetchedTxV, expectedTxV);

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
            nonce: 0n,
            value: 123n,
            gasLimit: 25_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
          };

          await this.provider.send("evm_setAutomine", [false]);

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const tx: LegacyRpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assertLegacyTransaction(tx, txHash, txParams);
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

        it("should get an existing transaction from goerli", async function () {
          if (!isFork || ALCHEMY_URL === undefined) {
            this.skip();
          }
          const goerliUrl = ALCHEMY_URL.replace("mainnet", "goerli");

          // If "mainnet" is not present the replacement failed so we skip the test
          if (goerliUrl === ALCHEMY_URL) {
            this.skip();
          }

          await this.provider.send("hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: goerliUrl,
              },
            },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            "0x3f0908ca1db37402b4fc18e8722dfffa9d78aa1c25b90c37dfe8c9f8a2612b2f",
          ]);

          assert.equal(tx.from, "0x84467283e3663522a02574288291a9d0f9c968c2");
        });

        it("should get a blob transaction from goerli", async function () {
          if (!isFork || ALCHEMY_URL === undefined) {
            this.skip();
          }
          const goerliUrl = ALCHEMY_URL.replace("mainnet", "goerli");

          // If "mainnet" is not present the replacement failed so we skip the test
          if (goerliUrl === ALCHEMY_URL) {
            this.skip();
          }

          await this.provider.send("hardhat_reset", [
            {
              forking: {
                jsonRpcUrl: goerliUrl,
                // Cancun block
                blockNumber: 10527489,
              },
            },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            // blob transaction
            "0x0190ab719774b0ed612789072e399157537845383c2d2445a9929784a098a5c9",
          ]);

          assert.equal(tx.from, "0xa1d6cf9ed782555a0572cc08380ee3b68a1df449");
        });

        it("should return access list transactions", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const txParams: TransactionParams = {
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            to: toBuffer(zeroAddress()),
            data: toBuffer("0x"),
            nonce: 0n,
            value: 123n,
            gasLimit: 30_000n,
            gasPrice: await getPendingBaseFeePerGas(this.provider),
            accessList: [
              [
                toBuffer(zeroAddress()),
                [
                  setLengthLeft(Buffer.from([0]), 32),
                  setLengthLeft(Buffer.from([1]), 32),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const tx: AccessListEIP2930RpcTransactionOutput =
            await this.provider.send("eth_getTransactionByHash", [txHash]);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          assertAccessListTransaction(
            tx,
            txHash,
            txParams,
            firstBlockNumber + 1,
            block.hash,
            0
          );
        });

        it("should return EIP-1559 transactions", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const maxFeePerGas = await getPendingBaseFeePerGas(this.provider);
          const txParams: TransactionParams = {
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            to: toBuffer(zeroAddress()),
            data: toBuffer("0x"),
            nonce: 0n,
            value: 123n,
            gasLimit: 30_000n,
            maxFeePerGas,
            maxPriorityFeePerGas: maxFeePerGas / 2n,
            accessList: [
              [
                toBuffer(zeroAddress()),
                [
                  setLengthLeft(Buffer.from([0]), 32),
                  setLengthLeft(Buffer.from([1]), 32),
                ],
              ],
            ],
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams
          );

          const tx: EIP1559RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          assertEIP1559Transaction(
            tx,
            txHash,
            txParams,
            firstBlockNumber + 1,
            block.hash,
            0
          );
        });
      });
    });
  });
});
