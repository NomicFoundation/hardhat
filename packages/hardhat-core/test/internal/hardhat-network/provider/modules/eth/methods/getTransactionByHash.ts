import Common from "@ethereumjs/common";
import { Transaction } from "@ethereumjs/tx";
import { assert } from "chai";
import {
  BN,
  bufferToHex,
  setLengthLeft,
  toBuffer,
  zeroAddress,
} from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { TransactionParams } from "../../../../../../../src/internal/hardhat-network/provider/node-types";
import {
  AccessListEIP2930RpcTransactionOutput,
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertAccessListTransaction,
  assertEIP1559Transaction,
  assertLegacyTransaction,
  assertTransactionFailure,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_CHAIN_ID,
  DEFAULT_NETWORK_ID,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
import {
  getSignedTxHash,
  sendTransactionFromTxParams,
} from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

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
            gasPrice: new BN(10e9),
          };

          const txHash = await sendTransactionFromTxParams(
            this.provider,
            txParams1
          );

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
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
            gasPrice: new BN(10e9),
          };

          const txHash2 = await sendTransactionFromTxParams(
            this.provider,
            txParams2
          );

          const block2 = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 2),
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
            gasPrice: new BN(10e9),
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

          assertLegacyTransaction(
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
              gasPrice: numberToRpcQuantity(10e9),
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
              gasPrice: numberToRpcQuantity(10e9),
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
          assert.equal(fetchedTx.gasPrice, numberToRpcQuantity(10e9));
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
            gasPrice: new BN(10e9),
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

        it("should return access list transactions", async function () {
          const firstBlock = await getFirstBlock();
          const txParams: TransactionParams = {
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            to: toBuffer(zeroAddress()),
            data: toBuffer("0x"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(30000),
            gasPrice: new BN(10e9),
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
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assertAccessListTransaction(
            tx,
            txHash,
            txParams,
            firstBlock + 1,
            block.hash,
            0
          );
        });

        it("should return EIP-1559 transactions", async function () {
          const firstBlock = await getFirstBlock();
          const txParams: TransactionParams = {
            from: toBuffer(DEFAULT_ACCOUNTS_ADDRESSES[1]),
            to: toBuffer(zeroAddress()),
            data: toBuffer("0x"),
            nonce: new BN(0),
            value: new BN(123),
            gasLimit: new BN(30000),
            maxFeePerGas: new BN(10e9),
            maxPriorityFeePerGas: new BN(1e9),
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
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assertEIP1559Transaction(
            tx,
            txHash,
            txParams,
            firstBlock + 1,
            block.hash,
            0
          );
        });
      });
    });
  });
});
