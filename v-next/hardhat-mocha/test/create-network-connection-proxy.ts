import type { NetworkConfig } from "hardhat/types/config";
import type { NetworkConnection } from "hardhat/types/network";
import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createNetworkConnectionProxy } from "../src/connect-on-before/create-network-connection-proxy.js";

describe("createNetworkConnectionProxy", () => {
  describe("when the connection is resolved", () => {
    it("should forward property access to the resolved object", () => {
      const resolved = buildMockNetworkConnectionFrom({ id: 99 });

      const proxy = createNetworkConnectionProxy(() => resolved);

      assert.equal(proxy.id, 99);
    });

    it("should bind functions to the resolved object", async () => {
      let wasCloseCalled = false;
      const resolved = buildMockNetworkConnectionFrom({
        close: async () => {
          wasCloseCalled = true;
        },
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      const closeFn = proxy.close;

      // invoke the close function
      await closeFn();

      assert.equal(wasCloseCalled, true);
    });

    it("should delegate set to the resolved object", async () => {
      let wasOriginalCloseCalled = false;
      let wasOverriddenCloseCalled = false;
      const resolved = buildMockNetworkConnectionFrom({
        close: async () => {
          wasOriginalCloseCalled = true;
        },
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      proxy.close = async () => {
        wasOverriddenCloseCalled = true;
      };

      const closeFn = proxy.close;

      // invoke the close function
      await closeFn();

      assert.equal(wasOriginalCloseCalled, false);
      assert.equal(wasOverriddenCloseCalled, true);
    });

    it("should return true for `in` on existing properties", () => {
      const resolved = buildMockNetworkConnectionFrom({
        id: 1,
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      assert.equal("id" in proxy, true);
    });

    it("should return false for `in` on missing properties", () => {
      const resolved = buildMockNetworkConnectionFrom({
        id: 1,
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      assert.equal("missing" in proxy, false);
    });

    it("should return the resolved object's keys from ownKeys", () => {
      const resolved = buildMockNetworkConnectionFrom({
        id: 1,
        close: async () => {},
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      // The mock only has a subset of the keys (as well as the test helper
      // key "then")
      assert.deepEqual(Object.keys(proxy), [
        "id",
        "networkConfig",
        "provider",
        "close",
        "then",
      ]);
    });

    it("should delegate getOwnPropertyDescriptor", () => {
      const resolved = buildMockNetworkConnectionFrom({
        id: 1,
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      const id = Object.getOwnPropertyDescriptor(proxy, "id");

      assert.equal(id?.value, 1);
      assert.equal(id?.writable, true);
    });

    it("should throw for `then` so the proxy is not a thenable", () => {
      const resolved = buildMockNetworkConnectionFrom({
        then: () => {},
      });

      const proxy = createNetworkConnectionProxy(() => resolved);

      assertThrowsHardhatError(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
        () => (proxy as any).then,
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE
          .AWAIT_CONNECT_ON_BEFORE,
        {},
      );
    });
  });

  describe("when the connection is not yet resolved", () => {
    it("should return a nested proxy for property (not undefined)", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      // The nested proxy is a truthy object, not undefined
      assert.ok(
        proxy.networkConfig !== undefined,
        "Expected nested proxy to not be undefined",
      );

      assert.equal(typeof proxy.networkConfig, "object");
    });

    it("should throw on set before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        () => {
          proxy.close = async () => {};
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.SET_BEFORE_HOOK,
        { property: "close" },
      );
    });

    it("should return false for `in`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assert.equal("id" in proxy, false);
    });

    it("should return an empty array from ownKeys", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assert.deepEqual(Object.keys(proxy), []);
    });

    it("should return undefined from getOwnPropertyDescriptor", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assert.equal(Object.getOwnPropertyDescriptor(proxy, "id"), undefined);
    });

    it("should throw for `then`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing `then` which is not part of the type
        () => (proxy as any).then,
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE
          .AWAIT_CONNECT_ON_BEFORE,
        {},
      );
    });
  });

  describe("nested proxy (destructured before resolution, used after)", () => {
    it("should forward property access once the connection resolves", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      // Destructure while unresolved — captures a nested proxy
      const { networkConfig } = proxy;

      // Now resolve
      resolved = buildMockNetworkConnectionFrom({
        networkConfig: { gas: 9999n },
      });

      assert.equal(networkConfig.gas, 9999n);
    });

    it("should bind functions on the nested target", async () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const { provider } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        provider: {
          request: async () => {
            return "test-request-response";
          },
        },
      });

      const requestFn = provider.request;

      assert.equal(
        await requestFn({ method: "eth_blockNumber" }),
        "test-request-response",
      );
    });

    it("should delegate set after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const { networkConfig } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        networkConfig: { chainId: 1 },
      });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
      (networkConfig as any).chainId = 999;

      assert.equal(networkConfig.chainId, 999);
    });

    it("should delegate `in` after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const { networkConfig } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        networkConfig: { chainId: 1 },
      });

      assert.equal("chainId" in networkConfig, true);
      assert.equal("missing" in networkConfig, false);
    });

    it("should return keys from ownKeys after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const { networkConfig } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        networkConfig: { chainId: 1 },
      });

      assert.deepEqual(Object.keys(networkConfig), ["chainId"]);
    });

    it("should delegate getOwnPropertyDescriptor after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const { networkConfig } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        networkConfig: { chainId: 1 },
      });

      const chainId = Object.getOwnPropertyDescriptor(networkConfig, "chainId");
      assert.equal(chainId?.value, 1);
    });
  });

  describe("nested proxy errors before resolution", () => {
    it("should throw on property access with a helpful message", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { provider } = proxy;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- trigger the get trap
          provider.request;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.ACCESS_BEFORE_HOOK,
        { property: "request" },
      );
    });

    it("should throw on set with a helpful message", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally allow set to test edge case
          (networkConfig as any).chainId = 1;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.SET_BEFORE_HOOK,
        { property: "chainId" },
      );
    });

    it("should return false for `in`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assert.equal("chainId" in networkConfig, false);
    });

    it("should return an empty array from ownKeys", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assert.deepEqual(Object.keys(networkConfig), []);
    });

    it("should return undefined for `then`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { provider: nested } = proxy;

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behaviour with plain objects
      assert.equal((nested as any).then, undefined);
    });
  });
});

function buildMockNetworkConnectionFrom({
  id = 1,
  networkConfig = {
    gas: 1000n,
  },
  provider = {
    request: async (_requestArguments: RequestArguments) => {},
  },
  close = async () => {},
  then = async () => {},
}: {
  id?: number;
  networkConfig?: Partial<NetworkConfig>;
  provider?: Partial<EthereumProvider>;
  close?: () => Promise<void>;
  then?: () => void;
}): NetworkConnection<"generic"> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
  return {
    id,
    networkConfig,
    provider,
    close,
    then,
  } as any;
}
