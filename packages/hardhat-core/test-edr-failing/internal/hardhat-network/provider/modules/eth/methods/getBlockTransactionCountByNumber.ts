import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertQuantity } from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import { PROVIDERS } from "../../../../helpers/providers";
import { sendTxToZeroAddress } from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_getBlockTransactionCountByNumber", async function () {
        it("should return null for non-existing blocks", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          assert.isNull(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(firstBlockNumber + 1),
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
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          await sendTxToZeroAddress(this.provider);

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByNumber", [
              numberToRpcQuantity(firstBlockNumber + 1),
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
    });
  });
});
