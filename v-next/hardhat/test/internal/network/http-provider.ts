import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  HttpProvider,
  getHttpDispatcher,
} from "../../../src/internal/network/http-provider.js";
import {
  ProviderError,
  ProviderErrorCode,
} from "../../../src/internal/network/provider-errors.js";
import { createTestEnvManager, initializeTestDispatcher } from "../../utils.js";

describe("http-provider", () => {
  describe("HttpProvider.create", () => {
    it("should create an HttpProvider", async () => {
      const provider = await HttpProvider.create({
        url: "http://example.com",
        networkName: "exampleNetwork",
        timeout: 20_000,
      });

      assert.ok(provider instanceof HttpProvider, "Not an HttpProvider");
    });

    it("should throw if the URL is invalid", async () => {
      await assertRejectsWithHardhatError(
        HttpProvider.create({
          url: "invalid url",
          networkName: "exampleNetwork",
          timeout: 20_000,
        }),
        HardhatError.ERRORS.NETWORK.INVALID_URL,
        { value: "invalid url" },
      );
    });
  });

  /**
   * To test the HttpProvider#request method, we need to use an interceptor to
   * mock the network requests. As the HttpProvider.create does not allow to
   * pass a custom dispatcher, we use the constructor directly.
   */
  describe("HttpProvider#request", async () => {
    const interceptor = await initializeTestDispatcher();
    const baseInterceptorOptions = {
      path: "/",
      method: "POST",
    };

    it("should make a request", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };
      const jsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: "0x1",
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(200, jsonRpcResponse);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      const result = await provider.request({
        method: "eth_chainId",
      });

      assert.ok(typeof result === "string", "Result is not a string");
      assert.equal(result, "0x1");
    });

    it("should throw if the params are an object", async () => {
      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      await assertRejectsWithHardhatError(
        provider.request({
          method: "eth_chainId",
          params: {},
        }),
        HardhatError.ERRORS.NETWORK.INVALID_REQUEST_PARAMS,
        {},
      );
    });

    it("should throw if the connection is refused", async () => {
      // We don't have a way to simulate a connection refused error with the
      // mock agent, so we use a real HttpProvider with localhost to test this
      // scenario.
      const provider = await HttpProvider.create({
        // Using a high-numbered port to ensure connection refused error
        url: "http://localhost:49152",
        networkName: "exampleNetwork",
        timeout: 20_000,
      });

      await assertRejectsWithHardhatError(
        provider.request({
          method: "eth_chainId",
        }),
        HardhatError.ERRORS.NETWORK.CONNECTION_REFUSED,
        { network: "exampleNetwork" },
      );
    });

    // I'm not sure how to test this one
    it.todo("should throw if the request times out", async () => {});

    it("should retry the request if it fails - retry-after header is set", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };
      const jsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: "0x1",
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .defaultReplyHeaders({ "retry-after": "0" })
        .reply(429);
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(200, jsonRpcResponse);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      const result = await provider.request({
        method: "eth_chainId",
      });

      assert.ok(typeof result === "string", "Result is not a string");
      assert.equal(result, "0x1");
    });

    it("should retry the request if it fails - retry-after header is not set", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };
      const jsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: "0x1",
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(429);
      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(200, jsonRpcResponse);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      const result = await provider.request({
        method: "eth_chainId",
      });

      assert.ok(typeof result === "string", "Result is not a string");
      assert.equal(result, "0x1");
    });

    it("should throw a ProviderError if the max retries are reached", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };

      const retries = 8; // Original request + 7 retries
      for (let i = 0; i < retries; i++) {
        interceptor
          .intercept({
            ...baseInterceptorOptions,
            body: JSON.stringify(jsonRpcRequest),
          })
          // Remove the retry-after header to test the exponential backoff
          // logic, but the test will take a long time to run
          .defaultReplyHeaders({ "retry-after": "0" })
          .reply(429);
      }

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      try {
        await provider.request({
          method: "eth_chainId",
        });
      } catch (error) {
        assert.ok(
          ProviderError.isProviderError(error),
          "Error is not a ProviderError",
        );
        assert.equal(error.code, ProviderErrorCode.LIMIT_EXCEEDED);
        return;
      }
      assert.fail("Function did not throw any error");
    });

    it("should throw a ProviderError if the retry-after header is too high", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .defaultReplyHeaders({ "retry-after": "6" })
        .reply(429);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      try {
        await provider.request({
          method: "eth_chainId",
        });
      } catch (error) {
        assert.ok(
          ProviderError.isProviderError(error),
          "Error is not a ProviderError",
        );
        assert.equal(error.code, ProviderErrorCode.LIMIT_EXCEEDED);
        return;
      }
      assert.fail("Function did not throw any error");
    });

    it("should throw if the response is not a valid JSON-RPC response", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      };
      const invalidResponse = {
        invalid: "response",
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(200, invalidResponse);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      await assertRejectsWithHardhatError(
        provider.request({
          method: "eth_chainId",
        }),
        HardhatError.ERRORS.NETWORK.INVALID_JSON_RESPONSE,
        {
          response: JSON.stringify(invalidResponse),
        },
      );
    });

    it("should throw a ProviderError if the response is a failed JSON-RPC response", async () => {
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainnId",
        params: [],
      };
      const jsonRpcResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32601,
          message: "The method eth_chainnId does not exist/is not available",
          data: {
            hostname: "localhost",
            method: "eth_chainnId",
          },
        },
      };

      interceptor
        .intercept({
          ...baseInterceptorOptions,
          body: JSON.stringify(jsonRpcRequest),
        })
        .reply(200, jsonRpcResponse);

      const provider = new HttpProvider(
        "http://localhost",
        "exampleNetwork",
        {},
        interceptor,
      );

      try {
        await provider.request({
          method: "eth_chainnId",
        });
      } catch (error) {
        assert.ok(
          ProviderError.isProviderError(error),
          "Error is not a ProviderError",
        );
        assert.equal(error.code, -32601);
        assert.deepEqual(error.data, {
          hostname: "localhost",
          method: "eth_chainnId",
        });
        return;
      }
      assert.fail("Function did not throw any error");
    });
  });

  describe("getHttpDispatcher", () => {
    const { setEnvVar } = createTestEnvManager();

    it("should return a pool dispatcher if process.env.http_proxy is not set", async () => {
      const dispatcher = await getHttpDispatcher("http://example.com");

      assert.equal(dispatcher.constructor.name, "Pool");
    });

    it("should return a pool dispatcher if shouldUseProxy is false", async () => {
      setEnvVar("http_proxy", "http://proxy.com");
      // shouldUseProxy is false for localhost
      const dispatcher = await getHttpDispatcher("http://localhost");

      assert.equal(dispatcher.constructor.name, "Pool");
    });

    it("should return a proxy dispatcher if process.env.http_proxy is set and shouldUseProxy is true", async () => {
      setEnvVar("http_proxy", "http://proxy.com");
      const dispatcher = await getHttpDispatcher("http://example.com");

      assert.equal(dispatcher.constructor.name, "ProxyAgent");
    });
  });
});
