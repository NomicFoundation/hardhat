import { assert } from "chai";

import { setCWD } from "../helpers/cwd";
import { useForkedProvider } from "../helpers/useProvider";

// reused from ethers.js
const INFURA_PROJECT_ID = "84842078b09946638c03157f83405213";
const INFURA_NETWORK = "mainnet";
const INFURA_URL = `https://${INFURA_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`;
const FORK_CONFIG = { jsonRpcUrl: INFURA_URL, blockNumberOrHash: undefined };

describe.only("Forked provider", () => {
  useForkedProvider(FORK_CONFIG);
  setCWD();

  it("knows the fork config", function () {
    const config = (this.provider as any)._forkConfig;
    assert.deepEqual(config, FORK_CONFIG);
  });
});
