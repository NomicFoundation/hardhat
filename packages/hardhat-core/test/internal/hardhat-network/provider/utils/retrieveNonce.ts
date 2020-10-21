import { assert } from "chai";

import { makeOrderedTransaction } from "../../../../../src/internal/hardhat-network/provider/PoolState";
import { retrieveNonce } from "../../../../../src/internal/hardhat-network/provider/utils/retrieveNonce";
import { createTestSerializedTransaction } from "../../helpers/blockchain";

describe("retrieveNonce", () => {
  it("can retrieve nonce from serialized transaction", () => {
    const tx = createTestSerializedTransaction({ nonce: 3 });
    const orderedTx = makeOrderedTransaction({
      orderId: 1,
      data: tx,
    });
    assert.equal(retrieveNonce(orderedTx).toNumber(), 3);
  });
});
