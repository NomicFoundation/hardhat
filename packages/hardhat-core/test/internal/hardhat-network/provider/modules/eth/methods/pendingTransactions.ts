import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { sendDummyTransaction } from "../../../../helpers/sendDummyTransaction";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

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
    });
  });
});
