import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import {
  RpcBlockOutput,
  RpcTransactionOutput,
} from "../../../../../../../src/internal/hardhat-network/provider/output";
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

      describe("eth_getBlockTransactionCountByHash", async function () {
        it("should return null for non-existing blocks", async function () {
          assert.isNull(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              "0x1111111111111111111111111111111111111111111111111111111111111111",
            ])
          );
        });

        it("Should return 0 for the genesis block", async function () {
          const genesisBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [numberToRpcQuantity(0), false]
          );

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              genesisBlock.hash,
            ]),
            0
          );
        });

        it("Should return 1 for others", async function () {
          const txhash = await sendTxToZeroAddress(this.provider);

          const txOutput: RpcTransactionOutput = await this.provider.send(
            "eth_getTransactionByHash",
            [txhash]
          );

          assertQuantity(
            await this.provider.send("eth_getBlockTransactionCountByHash", [
              txOutput.blockHash,
            ]),
            1
          );
        });
      });
    });
  });
});
