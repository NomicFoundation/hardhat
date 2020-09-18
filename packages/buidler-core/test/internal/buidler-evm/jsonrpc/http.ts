import { assert } from "chai";
import type { default as nodeFetch } from "node-fetch";
import sinon, { SinonStub } from "sinon";

import { BatchHttpRequestService } from "../../../../src/internal/buidler-evm/jsonrpc/http";
import { JsonRpcRequest } from "../../../../src/internal/util/jsonrpc";

function getRequest(method: string, params: any[] = []): JsonRpcRequest[] {
  return [
    {
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    },
  ];
}

function getResponse(result: any) {
  return {
    text: async () =>
      JSON.stringify([
        {
          jsonrpc: "2.0",
          id: 1,
          result,
        },
      ]),
  };
}

describe("BatchHttpRequestService", () => {
  let service: BatchHttpRequestService;
  let fetchMock: SinonStub;

  beforeEach(() => {
    const fetch = ((...args: any[]) => fetchMock(args)) as typeof nodeFetch;
    service = new BatchHttpRequestService(fetch, "https://example.com", 20_000);
  });

  describe("send", () => {
    it("can fetch a single request", async () => {
      fetchMock = sinon.mock().resolves(getResponse("0xdeadbeef"));
      const response = await service.send(getRequest("eth_blockNumber"));
      assert.deepEqual(response, ["0xdeadbeef"]);
    });

    it.skip("can fetch multiple requests", async () => {
      // TODO
    });

    it.skip("handles errors", async () => {
      // TODO
    });

    it.skip("returns the right responses for the right requests", async () => {
      // TODO match responses with requests by ids
    });

    it.skip("validates responses correctly", async () => {
      // TODO
    });
  });
});
