import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../helpers/providers";
import { getPendingBaseFeePerGas } from "../../../helpers/getPendingBaseFeePerGas";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("receiptsRoot", function () {
        let firstBlockNumber: number;

        beforeEach(async function () {
          firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
        });

        it("should have the right receiptsRoot when mining 1 tx", async function () {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          assert.strictEqual(
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
              gasPrice: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: DEFAULT_ACCOUNTS_ADDRESSES[0],
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(
                await getPendingBaseFeePerGas(this.provider)
              ),
            },
          ]);
          await this.provider.send("evm_mine", []);

          const block = await this.provider.send("eth_getBlockByNumber", [
            numberToRpcQuantity(firstBlockNumber + 1),
            false,
          ]);

          assert.strictEqual(
            block.receiptsRoot,
            "0xd95b673818fa493deec414e01e610d97ee287c9421c8eff4102b1647c1a184e4"
          );
        });
      });
    });
  });
});
