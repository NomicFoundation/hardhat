import { assert } from "chai";
import { addHexPrefix, BN, toBuffer } from "ethereumjs-util";

import { DAI_ADDRESS, INFURA_URL } from "../helpers/constants";
import { setCWD } from "../helpers/cwd";
import { useForkedProvider } from "../helpers/useProvider";

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
    it("should return DAI total supply", async function () {
      const daiTotalSupplySelector = "0x18160ddd";
      const daiAddress = addHexPrefix(DAI_ADDRESS.toString("hex"));

      const result = await this.provider.send("eth_call", [
        { to: daiAddress, data: daiTotalSupplySelector },
      ]);

      const bnResult = new BN(toBuffer(result));
      assert.isTrue(bnResult.gtn(0));
    });
  });
});
