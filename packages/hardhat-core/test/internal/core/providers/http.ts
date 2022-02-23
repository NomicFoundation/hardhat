import { assert } from "chai";
import { MockAgent, MockPool } from "undici";

import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { SuccessfulJsonRpcResponse } from "../../../../src/internal/util/jsonrpc";
import { ALCHEMY_URL } from "../../../setup";

function makeMockPool(url: string): MockPool {
  const agent = new MockAgent({
    // as advised by https://undici.nodejs.org/#/docs/best-practices/writing-tests
    keepAliveTimeout: 10, // milliseconds
    keepAliveMaxTimeout: 10, // milliseconds
  });
  agent.disableNetConnect();
  return new MockPool(url, { agent });
}

describe("HttpProvider", function () {
  const url = "http://some.node";
  const networkName = "NetworkName";
  const mockPool = makeMockPool(url);

  describe("request()", function () {
    it("should call mock pool's request()", async function () {
      const response: SuccessfulJsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: "whatever",
      };
      mockPool.intercept({ method: "POST", path: "/" }).reply(200, response);
      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);
      const result = await provider.request({ method: "net_version" });
      assert.equal(result, response.result);
    });
  });

  describe("429 Too many requests - retries", function () {
    it("Retries are correctly handled for Alchemy", async function () {
      if (ALCHEMY_URL === undefined) {
        this.skip();
        return;
      }

      const provider = new HttpProvider(ALCHEMY_URL, "Alchemy");

      // We just make a bunch of requests that would otherwise fail
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          provider.request({
            method: "eth_getTransactionCount",
            params: ["0x6b175474e89094c44da98b954eedeac495271d0f", "0x12"],
          })
        );
      }

      await Promise.all(requests);
    });
  });
});
