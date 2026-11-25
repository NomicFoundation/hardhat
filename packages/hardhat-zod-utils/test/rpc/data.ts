import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rpcData, rpcTransactionRequest } from "../../src/rpc/index.js";

describe("rpcData", () => {
  it("Should parse 0x as empty bytes", function () {
    assert.deepEqual(rpcData.parse("0x"), new Uint8Array());
  });

  it("Should parse a hex string into its bytes", function () {
    assert.deepEqual(rpcData.parse("0x00"), new Uint8Array([0]));
    assert.deepEqual(rpcData.parse("0xabcd"), new Uint8Array([0xab, 0xcd]));
  });
});

describe("rpcTransactionRequest", () => {
  it("Should parse data 0x as empty calldata", function () {
    const request = rpcTransactionRequest.parse({
      from: "0x0000000000000000000000000000000000000001",
      data: "0x",
    });

    assert.deepEqual(request.data, new Uint8Array());
  });
});
