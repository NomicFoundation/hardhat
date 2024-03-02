import { TransactionFactory } from "@nomicfoundation/ethereumjs-tx";
import { assert } from "chai";

import { rpcQuantityToNumber } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import { EXAMPLE_REVERT_CONTRACT } from "../helpers/contracts";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../helpers/providers";
import { deployContract } from "../helpers/transactions";
import { useHelpers } from "../helpers/useHelpers";

// `Error("a reason")` encoded
const REVERT_REASON_STRING =
  "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000086120726561736f6e000000000000000000000000000000000000000000000000";

// The error thrown by the provider when a transaction reverts has extra information, like the
// transaction hash (if the method is eth_send[Raw]Transaction) and the raw return data.
//
// The positions of these values in the error object (and even the key names) can be different,
// depending on if the provider is the in-process one or an http provider. We did it this way
// to make ethers work correctly both for v5 and v6, and for hardhat-chai-matchers reasons.

describe("error object in JSON-RPC response", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, isJsonRpc }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();

      describe("should have the right fields", async function () {
        useProvider();
        useHelpers();

        it("when using eth_sendTransaction", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          let transactionReverted = false;
          try {
            await this.provider.send("eth_sendTransaction", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}0000000000000000000000000000000000000000000000000000000000000000`,
              },
            ]);
          } catch (error: any) {
            transactionReverted = true;

            if (isJsonRpc) {
              assert.isObject(error.data);
              assert.equal(error.data.data, REVERT_REASON_STRING);
              assert.equal(error.data.message, error.message);
              assert.isString(error.data.txHash);
            } else {
              assert.equal(error.data, REVERT_REASON_STRING);
              assert.isString(error.transactionHash);
            }
          }

          assert.isTrue(
            transactionReverted,
            "Transaction should have reverted"
          );
        });

        it("when using eth_sendRawTransaction", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          let transactionReverted = false;
          try {
            // don't use remote base fee
            await this.provider.send("hardhat_setNextBlockBaseFeePerGas", [
              "0x10",
            ]);

            // build tx
            const nonce = rpcQuantityToNumber(
              await this.provider.send("eth_getTransactionCount", [
                DEFAULT_ACCOUNTS_ADDRESSES[0],
                "latest",
              ])
            );
            const tx = TransactionFactory.fromTxData(
              {
                to: contractAddress,
                data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}`,
                nonce,
                gasLimit: 1_000_000,
                gasPrice: 10_000_000_000,
              },
              { common: (this.hardhatNetworkProvider as any)._common }
            ).sign(Buffer.from(DEFAULT_ACCOUNTS[0].privateKey.slice(2), "hex"));

            const rawTx = `0x${Buffer.from(tx.serialize()).toString("hex")}`;

            // send tx
            await this.provider.send("eth_sendRawTransaction", [rawTx]);
          } catch (error: any) {
            transactionReverted = true;

            if (isJsonRpc) {
              assert.isObject(error.data);
              assert.equal(error.data.data, REVERT_REASON_STRING);
              assert.equal(error.data.message, error.message);
              assert.isString(error.data.txHash);
            } else {
              assert.equal(error.data, REVERT_REASON_STRING);
              assert.isString(error.transactionHash);
            }
          }

          assert.isTrue(
            transactionReverted,
            "Transaction should have reverted"
          );
        });

        it("when using eth_call", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          let transactionReverted = false;
          try {
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}0000000000000000000000000000000000000000000000000000000000000000`,
              },
            ]);
          } catch (error: any) {
            transactionReverted = true;

            if (isJsonRpc) {
              assert.isObject(error.data);
              assert.equal(error.data.data, REVERT_REASON_STRING);
              assert.equal(error.data.message, error.message);
              assert.isUndefined(error.data.txHash);
            } else {
              assert.equal(error.data, REVERT_REASON_STRING);
              assert.isUndefined(error.transactionHash);
            }
          }

          assert.isTrue(
            transactionReverted,
            "Transaction should have reverted"
          );
        });

        it("when using eth_estimateGas", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
          );

          let transactionReverted = false;
          try {
            await this.provider.send("eth_estimateGas", [
              {
                to: contractAddress,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}0000000000000000000000000000000000000000000000000000000000000000`,
              },
            ]);
          } catch (error: any) {
            transactionReverted = true;

            if (isJsonRpc) {
              assert.isObject(error.data);
              assert.equal(error.data.data, REVERT_REASON_STRING);
              assert.equal(error.data.message, error.message);
              assert.isUndefined(error.data.txHash);
            } else {
              assert.equal(error.data, REVERT_REASON_STRING);
              assert.isUndefined(error.transactionHash);
            }
          }

          assert.isTrue(
            transactionReverted,
            "Transaction should have reverted"
          );
        });
      });
    });
  });
});
