import { Common } from "@nomicfoundation/ethereumjs-common";
import { TransactionFactory } from "@nomicfoundation/ethereumjs-tx";
import { assert } from "chai";
import { Client } from "undici";

import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidArgumentsError,
  assertInvalidInputError,
  assertReceiptMatchesGethOne,
} from "../../../../helpers/assertions";
import { EXAMPLE_REVERT_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  PROVIDERS,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../../../../helpers/providers";
import { deployContract } from "../../../../helpers/transactions";
import { RpcTransactionOutput } from "../../../../../../../src/internal/hardhat-network/provider/output";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, isJsonRpc }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider({ hardfork: "london" });

      describe("eth_sendRawTransaction", async function () {
        it("Should throw if the data isn't a proper transaction", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            ["0x223456"],
            `Invalid transaction type ${0x22}.`
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

        it("should reject blob transactions", async function () {
          // blob tx signed with the private key of the first default account
          const rawBlobTx =
            "0x03f88380808080809400000000000000000000000000000000000000108080c080e1a0000000000000000000000000000000000000001012345678901234567890123401a0f3f7e5408804e3a0e3c4ac30a4f14b2995656a02d8b0279d7d48044d3cdf05e6a004e7606fef78d5221916053b3ec8a5fefddaa8a62ac6440f24a7c860ca25aa9f";

          await assertInvalidInputError(
            this.provider,
            "eth_sendRawTransaction",
            [rawBlobTx],
            "An EIP-4844 (shard blob) transaction was received, but Hardhat doesn't have support for them yet."
          );
        });

        describe("Transaction hash returned within the error data", function () {
          describe("Set lower baseFeePerGas", function () {
            // setting a lower baseFeePerGas here to avoid having to re-create the raw tx
            useProvider({ initialBaseFeePerGas: 1n });

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
              } catch (e: any) {
                assert.notInclude(e.message, "Tx should have failed");

                assert.isDefined(e.data.txHash);
              }
            });
          });
        });

        describe("Base fee validation", function () {
          // The raw tx we are using may not work in a fork because of its
          // chainID and nonce
          if (isFork) {
            return;
          }

          // We set an initial base fee too high for the raw tx
          useProvider({ initialBaseFeePerGas: 100n * 10n ** 9n });

          describe("With automining enabled", function () {
            it("Should reject txs that can't be mined in the next block", async function () {
              await assertInvalidInputError(
                this.provider,
                "eth_sendRawTransaction",
                [
                  "0xf8618001825208940000000000000000000000000000000000000001808082011aa03e2b434ea8994b24017a30d58870e7387a69523b25f153f0d90411a8af8343d6a00c26d36e92d8a8334193b02982ce0b2ec9afc85ad26eaf8c2993ad07d3495f95",
                ],
                "too low for the next block, which has a baseFeePerGas of"
              );
            });
          });

          describe("With automining disabled", function () {
            it("Should enqueue txs that can't be mined in the next block", async function () {
              await this.provider.send("evm_setAutomine", [false]);
              const txHash = await this.provider.send(
                "eth_sendRawTransaction",
                [
                  "0xf8618001825208940000000000000000000000000000000000000001808082011aa03e2b434ea8994b24017a30d58870e7387a69523b25f153f0d90411a8af8343d6a00c26d36e92d8a8334193b02982ce0b2ec9afc85ad26eaf8c2993ad07d3495f95",
                ]
              );

              const tx: RpcTransactionOutput = await this.provider.send(
                "eth_getTransactionByHash",
                [txHash]
              );

              assert.equal(tx.blockNumber, null);
            });
          });
        });

        describe("http JSON-RPC response", function () {
          useProvider();

          let client: Client;
          let common: Common;

          // send the transaction using an http client, otherwise the wrapped
          // provider will intercept the response and throw an error
          //
          // this method uses the first default account, and it assumes that
          // that account sent a tx before, so it uses a nonce of 1
          async function sendRawTransaction({ to, data }: any): Promise<any> {
            const tx = TransactionFactory.fromTxData(
              {
                to,
                data,
                nonce: 1,
                gasLimit: 1_000_000,
                gasPrice: 10_000_000_000,
              },
              { common }
            ).sign(pk);

            const rawTx = `0x${Buffer.from(tx.serialize()).toString("hex")}`;
            return client
              .request({
                method: "POST",
                path: "/",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  method: "eth_sendRawTransaction",
                  params: [rawTx],
                }),
              })
              .then((x) => x.body.json());
          }

          beforeEach(async function () {
            if (this.serverInfo === undefined || isFork) {
              this.skip();
            }

            const url = `http://${this.serverInfo.address}:${this.serverInfo.port}`;
            client = new Client(url, {
              keepAliveTimeout: 10,
              keepAliveMaxTimeout: 10,
            });

            // TODO: Find out a better way to obtain the common here
            const provider: any = this.hardhatNetworkProvider;

            // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
            common = provider["_common"];
          });

          const pk = Buffer.from(
            DEFAULT_ACCOUNTS[0].privateKey.slice(2),
            "hex"
          );

          it("Should return the hash of the transaction that reverts", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await sendRawTransaction({
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
            });

            const txHash = response.error?.data?.txHash;
            assert.isDefined(txHash);

            const receipt = await this.provider.send(
              "eth_getTransactionReceipt",
              [txHash]
            );

            assert.equal(receipt.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
            assert.equal(receipt.to, contractAddress);
            assert.equal(receipt.status, "0x0");
          });

          it("Should return the data of a transaction that reverts without a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await sendRawTransaction({
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.reverts}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(response.error.data.data, "0x");
          });

          it("Should return the data of a transaction that reverts with a reason string", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await sendRawTransaction({
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(
              response.error.data.data,
              // Error(string) encoded with value "a reason"
              "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000086120726561736f6e000000000000000000000000000000000000000000000000"
            );
          });

          it("Should return the data of a transaction that panics", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await sendRawTransaction({
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.panics}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(
              response.error.data.data,
              // Panic(uint256) encoded with value 0x32 (out-of-bounds array access)
              "0x4e487b710000000000000000000000000000000000000000000000000000000000000032"
            );
          });

          it("Should return the data of a transaction that reverts with a custom error", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
            );

            const response = await sendRawTransaction({
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.customError}`,
            });

            assert.isDefined(response.error?.data);
            assert.equal(response.error.message, response.error.data.message);
            assert.equal(
              response.error.data.data,
              // MyCustomError() encoded
              "0x4e7254d6"
            );
          });
        });
      });
    });
  });
});
