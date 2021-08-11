import { assert } from "chai";
import { BN, toBuffer, zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidInputError,
  assertNodeBalances,
  assertPendingNodeBalances,
  assertQuantity,
} from "../../../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../../../helpers/constants";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_ACCOUNTS_BALANCES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";

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
          const gasPrice = new BN(10e9);
          await assertNodeBalances(this.provider, DEFAULT_ACCOUNTS_BALANCES);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(gasPrice),
            },
          ]);

          await assertNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0].sub(gasPrice.muln(21000).addn(1)),
            DEFAULT_ACCOUNTS_BALANCES[1].addn(1),
            ...DEFAULT_ACCOUNTS_BALANCES.slice(2),
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: numberToRpcQuantity(2),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(gasPrice.muln(2)),
            },
          ]);

          await assertNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0].sub(
              gasPrice
                .muln(21000)
                .addn(1)
                .add(gasPrice.muln(21000).muln(2).addn(2))
            ),
            DEFAULT_ACCOUNTS_BALANCES[1].addn(1 + 2),
            ...DEFAULT_ACCOUNTS_BALANCES.slice(2),
          ]);
        });

        it("Should return the pending balance", async function () {
          const gasPrice = new BN(10e9);
          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(1),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(gasPrice),
              nonce: numberToRpcQuantity(0),
            },
          ]);

          await assertPendingNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0],
            DEFAULT_ACCOUNTS_BALANCES[1].sub(gasPrice.muln(21000).addn(1)),
            DEFAULT_ACCOUNTS_BALANCES[2].addn(1),
            ...DEFAULT_ACCOUNTS_BALANCES.slice(3),
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: DEFAULT_ACCOUNTS_ADDRESSES[2],
              value: numberToRpcQuantity(2),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(gasPrice.muln(2)),
              nonce: numberToRpcQuantity(1),
            },
          ]);

          await assertPendingNodeBalances(this.provider, [
            DEFAULT_ACCOUNTS_BALANCES[0],
            DEFAULT_ACCOUNTS_BALANCES[1].sub(
              gasPrice
                .muln(21000)
                .addn(1)
                .add(gasPrice.muln(21000).muln(2).addn(2))
            ),
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
    });
  });
});
