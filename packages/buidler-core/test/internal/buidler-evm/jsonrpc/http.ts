import { assert } from "chai";
import type { default as nodeFetch } from "node-fetch";
import sinon, { SinonStub } from "sinon";

import { BatchHttpRequestService } from "../../../../src/internal/buidler-evm/jsonrpc/http";
import { JsonRpcRequest } from "../../../../src/internal/util/jsonrpc";

function getRequest(
  items: Array<{ method: string; params?: any[] }> = []
): JsonRpcRequest[] {
  return items.map(({ method, params = [] }, index) => ({
    jsonrpc: "2.0",
    id: index + 1,
    method,
    params,
  }));
}

function getResponse(
  items: Array<{ result: any; id?: number } | { error: any; id?: number }> = []
) {
  return {
    text: async () =>
      JSON.stringify(
        items.map((item, index) => ({
          jsonrpc: "2.0",
          id: index + 1,
          ...item,
        }))
      ),
  };
}

describe("BatchHttpRequestService", () => {
  let service: BatchHttpRequestService;
  let fetchMock: SinonStub;

  beforeEach(() => {
    const fetch = ((...args: any[]) => fetchMock(args)) as typeof nodeFetch;
    service = new BatchHttpRequestService("https://example.com", fetch, 20_000);
  });

  describe("send", () => {
    it("can fetch a single request", async () => {
      const request = getRequest([{ method: "eth_blockNumber" }]);
      const response = getResponse([{ result: "0xdeadbeef" }]);
      fetchMock = sinon.mock().resolves(response);
      const result = await service.send(request);
      assert.deepEqual(result, ["0xdeadbeef"]);
    });

    it("can fetch multiple requests", async () => {
      const request = getRequest([
        { method: "eth_blockNumber" },
        { method: "eth_coinbase" },
      ]);
      const response = getResponse([
        { result: "0xdeadbeef" },
        { result: "0x1337" },
      ]);
      fetchMock = sinon.mock().resolves(response);
      const result = await service.send(request);
      assert.deepEqual(result, ["0xdeadbeef", "0x1337"]);
    });

    it("handles errors", async () => {
      const request = getRequest([
        { method: "net_version" },
        { method: "eth_blockNumber" },
        { method: "eth_coinbase" },
      ]);
      const response = getResponse([
        { error: { message: "Nope", code: -1234, data: "foo" } },
        { result: "0xdeadbeef" },
        { error: { message: "Sorry", code: 42 } },
      ]);
      fetchMock = sinon.mock().resolves(response);
      const result: any[] = await service.send(request);

      const error1: any = new Error();
      error1.message = "Nope";
      error1.code = -1234;
      error1.data = "foo";
      const error3: any = new Error();
      error3.message = "Sorry";
      error3.code = 42;
      error3.data = undefined;

      assert.lengthOf(result, 3);
      assert.deepEqual({ ...result[0] }, { ...error1 });
      assert.deepEqual(result[1], "0xdeadbeef");
      assert.deepEqual({ ...result[2] }, { ...error3 });
    });

    it("returns the right responses for the right requests", async () => {
      const request = getRequest([
        { method: "net_version" },
        { method: "eth_blockNumber" },
        { method: "eth_coinbase" },
      ]);
      const response = getResponse([
        { result: "a", id: 2 },
        { result: "b", id: 1 },
        { result: "c", id: 3 },
      ]);
      fetchMock = sinon.mock().resolves(response);
      const result = await service.send(request);
      assert.deepEqual(result, ["b", "a", "c"]);
    });

    it("rejects on mismatched number of responses", async () => {
      const request = getRequest([
        { method: "net_version" },
        { method: "eth_blockNumber" },
        { method: "eth_coinbase" },
      ]);
      const response = getResponse([{ result: "a" }, { result: "b" }]);
      fetchMock = sinon.mock().resolves(response);
      await assert.isRejected(service.send(request));
    });

    it("rejects on mismatched ids of responses", async () => {
      const request = getRequest([
        { method: "net_version" },
        { method: "eth_blockNumber" },
        { method: "eth_coinbase" },
      ]);
      const response = getResponse([
        { result: "a", id: 1 },
        { result: "b", id: 2 },
        { result: "c", id: 1000 },
      ]);
      fetchMock = sinon.mock().resolves(response);
      await assert.isRejected(service.send(request));
    });

    it("rejects on non-json response", async () => {
      const request = getRequest([{ method: "net_version" }]);
      const response = {
        text: async () => "I am not JSON, sorry.",
      };
      fetchMock = sinon.mock().resolves(response);
      await assert.isRejected(service.send(request));
    });

    it("rejects on invalid json response", async () => {
      const request = getRequest([{ method: "net_version" }]);
      const response = {
        text: async () => '[{"foo":123}]',
      };
      fetchMock = sinon.mock().resolves(response);
      await assert.isRejected(service.send(request));
    });
  });
});
