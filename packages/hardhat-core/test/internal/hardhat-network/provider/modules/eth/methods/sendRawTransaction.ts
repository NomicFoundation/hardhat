import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidArgumentsError,
  assertInvalidInputError,
  assertReceiptMatchesGethOne,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import { PROVIDERS } from "../../../../helpers/providers";
import { RpcTransactionOutput } from "../../../../../../../src/internal/hardhat-network/provider/output";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, isJsonRpc }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

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

        describe("Transaction hash returned within the error data", function () {
          describe("Set lower baseFeePerGas", function () {
            // setting a lower baseFeePerGas here to avoid having to re-create the raw tx
            useProvider({ initialBaseFeePerGas: 1 });

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
          useProvider({ initialBaseFeePerGas: 100e9 });

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
      });
    });
  });
});
