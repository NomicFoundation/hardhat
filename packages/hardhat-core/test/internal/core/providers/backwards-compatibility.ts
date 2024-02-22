import { assert } from "chai";
import { promisify } from "util";

import { BackwardsCompatibilityProviderAdapter } from "../../../../src/internal/core/providers/backwards-compatibility";
import { JsonRpcRequest, JsonRpcResponse } from "../../../../src/types";

import { MockedProvider } from "./mocks";

describe("BackwardsCompatibilityProviderAdapter", function () {
  let mock: MockedProvider;
  let provider: BackwardsCompatibilityProviderAdapter;

  beforeEach(function () {
    mock = new MockedProvider();
    provider = new BackwardsCompatibilityProviderAdapter(mock);
  });

  describe("send", function () {
    it("Should forward send calls to request", async function () {
      await provider.send("m", [1, 2, 3]);
      await provider.send("m2", ["asd"]);
      assert.deepEqual(mock.getLatestParams("m"), [1, 2, 3]);
      assert.deepEqual(mock.getLatestParams("m2"), ["asd"]);
    });

    it("Should return the same than request", async function () {
      mock.setReturnValue("m", 123);

      const ret = await provider.send("m");
      assert.strictEqual(ret, 123);
    });
  });

  describe("sendAsync", function () {
    describe("Single request", function () {
      it("Should forward it to request", async function () {
        const sendAsync = promisify<JsonRpcRequest, JsonRpcResponse>(
          provider.sendAsync.bind(provider)
        );

        await sendAsync({
          id: 123,
          jsonrpc: "2.0",
          method: "m",
          params: [1, 2, 3],
        });

        assert.deepEqual(mock.getLatestParams("m"), [1, 2, 3]);
      });

      it("Should return the same than request", async function () {
        const sendAsync = promisify<JsonRpcRequest, JsonRpcResponse>(
          provider.sendAsync.bind(provider)
        );

        mock.setReturnValue("m", 123456);
        const res = await sendAsync({
          id: 123,
          jsonrpc: "2.0",
          method: "m",
          params: [1, 2, 3],
        });

        assert.strictEqual(res.id, 123);
        assert.strictEqual(res.jsonrpc, "2.0");
        assert.strictEqual(res.result, 123456);
        assert.isUndefined(res.error);
      });
    });
  });
});
