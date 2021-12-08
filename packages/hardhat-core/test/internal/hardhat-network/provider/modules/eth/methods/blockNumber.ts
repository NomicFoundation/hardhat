import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertQuantity } from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
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

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      describe("eth_blockNumber", async function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("should return the current block number as QUANTITY", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 1);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 2);

          await sendTxToZeroAddress(this.provider);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 3);
        });

        it("Should increase if a transaction gets to execute and fails", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          try {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: "0x0000000000000000000000000000000000000001",
                gas: numberToRpcQuantity(21000), // Address 1 is a precompile, so this will OOG
                gasPrice: numberToRpcQuantity(10e9),
              },
            ]);

            assert.fail("Tx should have failed");
          } catch (e: any) {
            assert.notInclude(e.message, "Tx should have failed");
          }

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock + 1);
        });

        it("Shouldn't increase if a call is made", async function () {
          let blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);

          await this.provider.send("eth_call", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: "0x0000000000000000000000000000000000000000",
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(10e9),
            },
          ]);

          blockNumber = await this.provider.send("eth_blockNumber");
          assertQuantity(blockNumber, firstBlock);
        });
      });
    });
  });
});
