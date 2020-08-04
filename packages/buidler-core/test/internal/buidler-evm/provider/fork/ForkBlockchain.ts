import { assert } from "chai";
import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { ForkBlockchain } from "../../../../../src/internal/buidler-evm/provider/fork/ForkBlockchain";
import { INFURA_URL } from "../../helpers/constants";
import { DEFAULT_HARDFORK } from "../../helpers/useProvider";

describe("ForkBlockchain", () => {
  let client: JsonRpcClient;
  let blockNumber: BN;
  let common: Common;
  let fb: ForkBlockchain;

  before(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    blockNumber = await client.getLatestBlockNumber();
    common = new Common("mainnet", DEFAULT_HARDFORK);
  });

  beforeEach(async () => {
    fb = new ForkBlockchain(client, blockNumber, common);
  });

  it("can be constructed", () => {
    assert.instanceOf(fb, ForkBlockchain);
  });

  describe("getBlock", () => {
    it("can get block object", async () => {
      const block = await fb.getBlock(new BN(10496585));

      assert.equal(
        block?.hash().toString("hex"),
        "71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812"
      );

      assert.equal(block?.transactions.length, 192);
      assert.equal(
        block?.transactions[0].hash().toString("hex"),
        "ed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8"
      );
      assert.equal(
        block?.transactions[191].hash().toString("hex"),
        "d809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7"
      );
    });

    it("can get block object with create transaction", async () => {
      const daiCreationBlock = new BN(4719568);
      const daiCreateTxPosition = 85;
      const block = await fb.getBlock(daiCreationBlock);
      assert.equal(
        block?.transactions[daiCreateTxPosition].to.toString("hex"),
        ""
      );
      assert.equal(
        block?.transactions[daiCreateTxPosition].hash().toString("hex"),
        "b95343413e459a0f97461812111254163ae53467855c0d73e0f1e7c5b8442fa3"
      );
    });
  });
});
