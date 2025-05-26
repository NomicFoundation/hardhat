import { assert, expect } from "chai";
import { MockAgent, MockPool } from "undici";

import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { SuccessfulJsonRpcResponse } from "../../../../src/internal/util/jsonrpc";
import { expectHardhatError } from "../../../helpers/errors";
import { ProviderError } from "../../../../src/internal/core/providers/errors";

const TOO_MANY_REQUEST_STATUS = 429;

function makeMockPool(url: string): MockPool {
  const agent = new MockAgent({
    // as advised by https://undici.nodejs.org/#/docs/best-practices/writing-tests
    keepAliveTimeout: 10, // milliseconds
    keepAliveMaxTimeout: 10, // milliseconds
  });
  // throw when requests are not matched in a MockAgent intercept
  agent.disableNetConnect();
  return new MockPool(url, { agent });
}

describe("HttpProvider", function () {
  const url = "http://some.node";
  const networkName = "NetworkName";

  const successResponse: SuccessfulJsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: "whatever",
  };

  describe("constructor()", function () {
    it("should throw an error if network or forking URL is an empty string", async function () {
      expectHardhatError(() => {
        const emptyURL = "";
        new HttpProvider(emptyURL, networkName, {}, 20000);
      }, ERRORS.NETWORK.EMPTY_URL);

      expectHardhatError(() => {
        const emptyURLwithWhitespace = " ";
        new HttpProvider(emptyURLwithWhitespace, networkName, {}, 20000);
      }, ERRORS.NETWORK.EMPTY_URL);
    });
  });

  describe("request()", function () {
    it("should call mock pool's request()", async function () {
      const mockPool = makeMockPool(url);
      mockPool
        .intercept({ method: "POST", path: "/" })
        .reply(200, successResponse);
      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);
      const result = await provider.request({ method: "net_version" });
      assert.equal(result, successResponse.result);
    });

    it("should retry even if the rate-limit response lacks a retry-after header", async function () {
      const mockPool = makeMockPool(url);
      let tooManyRequestsReturned = false;
      mockPool.intercept({ method: "POST", path: "/" }).reply(() => {
        tooManyRequestsReturned = true;
        return {
          statusCode: TOO_MANY_REQUEST_STATUS,
          data: "",
          responseOptions: { headers: {} },
        };
      });
      mockPool
        .intercept({ method: "POST", path: "/" })
        .reply(200, successResponse);
      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);
      const result = await provider.request({ method: "net_version" });
      assert.equal(result, successResponse.result);
      assert(tooManyRequestsReturned);
    });

    it("should retry upon receiving a rate-limit response that includes a retry-after header", async function () {
      const mockPool = makeMockPool(url);
      let tooManyRequestsReturned = false;
      mockPool.intercept({ method: "POST", path: "/" }).reply(() => {
        tooManyRequestsReturned = true;
        return {
          statusCode: TOO_MANY_REQUEST_STATUS,
          data: "",
          responseOptions: { headers: { "retry-after": "1" } },
        };
      });
      mockPool
        .intercept({ method: "POST", path: "/" })
        .reply(200, successResponse);
      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);
      const result = await provider.request({ method: "net_version" });
      assert.equal(result, successResponse.result);
      assert(tooManyRequestsReturned);
    });

    it("should throw an error if it receives hardhat_setLedgerOutputEnabled as a method", async function () {
      const mockPool = makeMockPool(url);
      mockPool
        .intercept({ method: "POST", path: "/" })
        .reply(200, successResponse);
      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);
      await expect(
        provider.request({ method: "hardhat_setLedgerOutputEnabled" })
      ).to.be.eventually.rejectedWith(
        ProviderError,
        "hardhat_setLedgerOutputEnabled - Method not supported"
      );
    });

    it("handles deprecated eth_accounts method by returning empty array", async function () {
      const mockPool = makeMockPool(url);
      const mockResponse = {
        jsonrpc: "2.0",
        id: 3,
        error: {
          code: -32000,
          message: "the method has been deprecated: eth_accounts",
        },
      };
      mockPool
        .intercept({ method: "POST", path: "/" })
        .reply(200, mockResponse);

      const provider = new HttpProvider(url, networkName, {}, 20000, mockPool);

      expect(await provider.request({ method: "eth_accounts" })).to.deep.eq([]);
    });
  });
});
