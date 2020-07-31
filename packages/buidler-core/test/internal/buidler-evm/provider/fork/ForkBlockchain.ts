import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { ForkBlockchain } from "../../../../../src/internal/buidler-evm/provider/fork/ForkBlockchain";
import { INFURA_URL } from "../../helpers/constants";

describe("ForkBlockchain", () => {
  let client: JsonRpcClient;
  let blockNumber: BN;
  let fb: ForkBlockchain;

  before(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    blockNumber = await client.getLatestBlockNumber();
  });

  beforeEach(async () => {
    fb = new ForkBlockchain(client, blockNumber);
  });

  it("can be constructed", () => {
    assert.instanceOf(fb, ForkBlockchain);
  });
});
