import { assert } from "chai";
import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { ForkBlockchain } from "../../../../../src/internal/buidler-evm/provider/fork/ForkBlockchain";
import { getTestCommon } from "../../helpers/common";
import { INFURA_URL } from "../../helpers/constants";

describe("ForkBlockchain", () => {
  let client: JsonRpcClient;
  let blockNumber: BN;
  let common: Common;
  let fb: ForkBlockchain;

  before(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    blockNumber = await client.getLatestBlockNumber();
    common = getTestCommon();
  });

  beforeEach(async () => {
    fb = new ForkBlockchain(client, blockNumber, common);
  });

  it("can be constructed", () => {
    assert.instanceOf(fb, ForkBlockchain);
  });
});
