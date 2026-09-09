import { assert } from "chai";

import { EIP1193JsonRpcClient } from "../../src/internal/execution/jsonrpc-client.js";

describe("EIP1193JsonRpcClient", () => {
  describe("call", () => {
    it("should preserve null return data from a nested JSON-RPC error", async () => {
      const provider = {
        request: async () => {
          const error = new Error("execution reverted");
          Object.assign(error, { data: { data: null } });
          throw error;
        },
      };
      const client = new EIP1193JsonRpcClient(provider);

      const result = await client.call(
        {
          from: "0x0000000000000000000000000000000000000001",
          value: 0n,
          data: "0x",
        },
        "latest",
      );

      assert.deepEqual(result, {
        success: false,
        returnData: null,
        customErrorReported: false,
      });
    });
  });
});
