import { zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { randomAddress } from "../../../../../../../src/internal/hardhat-network/provider/fork/random";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidInputError,
  assertQuantity,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
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
              gasPrice: numberToRpcQuantity(10e9),
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
              gasPrice: numberToRpcQuantity(10e9),
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
              gasPrice: numberToRpcQuantity(10e9),
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
    });
  });
});
