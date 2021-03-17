import { assert } from "chai";

import {
  randomAddressString,
  randomHash,
} from "../../../../../src/internal/hardhat-network/provider/fork/random";

const HASH_REGEX = /^0x[a-f\d]{64}$/;
const ADDRESS_REGEX = /^0x[a-f\d]{40}$/;

describe("randomHash", () => {
  it("matches regex pattern", async () => {
    assert.isTrue(HASH_REGEX.test(randomHash()));
  });
});

describe("randomAddress", () => {
  it("matches regex pattern", async () => {
    assert.isTrue(ADDRESS_REGEX.test(randomAddressString()));
  });
});
