import { describe, it } from "node:test";

import { createMockedNetworkHre } from "./hooks-mock.js";

// Test that the request and its additional sub-request (when present)
// are correctly modified in the "onRequest" hook handler.
// These tests simulate a real scenario where the user calls "await connection.provider.request(jsonRpcRequest)".
describe("request-handlers - e2e", () => {
  it("should successfully executes all the handlers", async () => {
    const hre = await createMockedNetworkHre(
      {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            chainId: 1,
          },
        },
      },
      {
        eth_chainId: "0x1",
      },
    );

    // Use the localhost network for these tests because the modifier is only
    // applicable to HTTP networks. EDR networks do not require this modifier.
    const connection = await hre.network.connect("localhost");

    await connection.provider.request({
      method: "eth_sendTransaction",
      params: [],
    });
  });
});
