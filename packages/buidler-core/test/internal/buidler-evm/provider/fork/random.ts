import { assert } from "chai";

import {
  randomAddress,
  randomHash,
} from "../../../../../src/internal/buidler-evm/provider/fork/random";

const HASH_REGEX = /^[a-f\d]{64}$/;
const ADDRESS_REGEX = /^[a-f\d]{40}$/;

describe("randomHash", () => {
  it("matches regex pattern", async () => {
    assert.isTrue(HASH_REGEX.test(randomHash()));
  });
});

describe("randomAddress", () => {
  it("matches regex pattern", async () => {
    assert.isTrue(ADDRESS_REGEX.test(randomAddress()));
  });
});
