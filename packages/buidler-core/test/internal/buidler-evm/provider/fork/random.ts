import { assert } from "chai";

import { randomHash } from "../../../../../src/internal/buidler-evm/provider/fork/random";

const HASH_REGEX = /^[a-f\d]{64}$/;

describe("randomHash", () => {
  it("matches regex pattern", async () => {
    assert.isTrue(HASH_REGEX.test(randomHash()));
  });
});
