import { assert } from "chai";

import { setCWD } from "../helpers/cwd";
import { useForkedProvider } from "../helpers/useProvider";

// reused from ethers.js
const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;
const FORK_CONFIG = { jsonRpcUrl: INFURA_URL, blockNumberOrHash: undefined };

describe.only("Forked provider", () => {
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
});
