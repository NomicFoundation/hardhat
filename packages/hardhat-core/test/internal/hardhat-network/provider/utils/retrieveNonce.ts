import { assert } from "chai";

import { retrieveNonce } from "../../../../../src/internal/hardhat-network/provider/utils/retrieveNonce";
import { createTestSerializedTransaction } from "../../helpers/blockchain";

describe("retrieveNonce", () => {
  it("can retrieve nonce from serialized transaction", () => {
    const tx = createTestSerializedTransaction({ orderId: 1, nonce: 3 });
    assert.equal(retrieveNonce(tx).toNumber(), 3);
  });
});
