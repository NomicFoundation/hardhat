import { assert } from "chai";
import { addHexPrefix, BN, bufferToHex, toBuffer } from "ethereumjs-util";

import { assertQuantity } from "../helpers/assertions";
import {
  DAI_ADDRESS,
  EMPTY_ACCOUNT_ADDRESS,
  INFURA_URL,
  WETH_ADDRESS,
} from "../helpers/constants";
import { quantityToBN } from "../helpers/conversions";
import { setCWD } from "../helpers/cwd";
import { useForkedProvider } from "../helpers/useForkedProvider";

const FORK_CONFIG = { jsonRpcUrl: INFURA_URL, blockNumberOrHash: undefined };

describe("Forked provider", () => {
  useForkedProvider(FORK_CONFIG);
  setCWD();

  it("knows the fork config", function () {
    const config = (this.provider as any)._forkConfig;
    assert.deepEqual(config, FORK_CONFIG);
  });

  it("can get the current block number", async function () {
    const blockNumber = await this.provider.send("eth_blockNumber");
    const minBlockNumber = 10494745; // mainnet block number at 20.07.20
    assert.isAtLeast(parseInt(blockNumber, 16), minBlockNumber);
  });

  describe("eth_call", function () {
    it("should be able to return DAI total supply", async function () {
      const daiTotalSupplySelector = "0x18160ddd";
      const daiAddress = addHexPrefix(DAI_ADDRESS.toString("hex"));

      const result = await this.provider.send("eth_call", [
        { to: daiAddress, data: daiTotalSupplySelector },
      ]);

      const bnResult = new BN(toBuffer(result));
      assert.isTrue(bnResult.gtn(0));
    });
  });

  describe("get_balance", function () {
    it("should return 0 for empty accounts", async function () {
      assertQuantity(
        await this.provider.send("eth_getBalance", [
          bufferToHex(EMPTY_ACCOUNT_ADDRESS),
        ]),
        0
      );
    });

    it("should return balance of WETH contract", async function () {
      const result = await this.provider.send("eth_getBalance", [
        bufferToHex(WETH_ADDRESS),
      ]);
      assert.isTrue(quantityToBN(result).gtn(0));
    });
  });
});
