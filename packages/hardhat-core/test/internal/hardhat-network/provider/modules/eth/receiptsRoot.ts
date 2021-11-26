import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../helpers/retrieveForkBlockNumber";

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

      describe("receiptsRoot", function () {
        let firstBlock: number;

        beforeEach(async function () {
          firstBlock = await getFirstBlock();
        });

        it("should have the right receiptsRoot when mining 1 tx", async function () {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(10e9),
            },
          ]);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assert.equal(
            block.receiptsRoot,
            "0x056b23fbba480696b65fe5a59b8f2148a1299103c4f57df839233af2cf4ca2d2"
          );
        });

        it("should have the right receiptsRoot when mining 2 txs", async function () {
          await this.provider.send("evm_setAutomine", [false]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(10e9),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(10e9),
            },
          ]);
          await this.provider.send("evm_mine", []);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlock + 1),
            false,
          ]);

          assert.equal(
            block.receiptsRoot,
            "0xd95b673818fa493deec414e01e610d97ee287c9421c8eff4102b1647c1a184e4"
          );
        });
      });
    });
  });
});
