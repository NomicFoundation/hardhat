import type { NetworkHelpers } from "@nomicfoundation/hardhat-network-helpers/types";
import type { NetworkConfig } from "hardhat/types/config";
import type { NetworkConnection } from "hardhat/types/network";
import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import { createNetworkConnectionProxy } from "../src/connect-on-before/create-network-connection-proxy.js";

describe("createNetworkConnectionProxy", () => {
  describe("when the connection is resolved", () => {
    describe("inspect and toString", () => {
      // These tests are here to document the behavior that the proxy forces
      // on us, not because this is the ideal behavior
      it("Should partially support `util.inspect`", () => {
        const resolved = buildMockNetworkConnectionFrom({ id: 99 });
        const proxy = createNetworkConnectionProxy(() => resolved);

        assert.equal(util.inspect(proxy), "[Function: NetworkConnectionProxy]");
      });

      it("Should partially support `toString`", () => {
        const resolved = buildMockNetworkConnectionFrom({ id: 99 });
        const proxy = createNetworkConnectionProxy(() => resolved);
        assert.equal(proxy.toString(), "[object Function]");
      });
    });

    it("should forward property access to the resolved object", () => {
      const resolved = buildMockNetworkConnectionFrom({ id: 99 });

      const proxy = createNetworkConnectionProxy(() => resolved);

      assert.equal(proxy.id, 99);
    });

    describe("function properties", () => {
      it("should work with functions to the resolved object", async () => {
        let wasCloseCalled = false;

        const resolved = buildMockNetworkConnectionFrom({
          id: 99,
          async close() {
            wasCloseCalled = true;
          },
        });

        const proxy = createNetworkConnectionProxy(() => resolved);

        const closeFn = proxy.close;

        // invoke the close function
        await closeFn();

        assert.equal(wasCloseCalled, true);
      });

      it("shouldn't bind functions to the resolved object on get", async () => {
        const resolved = buildMockNetworkConnectionFrom({
          id: 99,
          async close() {
            // This should throw because `this` should be undefined as we are
            // getting the function but not binding it
            console.log(this.id);
          },
        });

        const proxy = createNetworkConnectionProxy(() => resolved);

        const closeFn = proxy.close;

        await assertRejects(
          () => closeFn(),
          (e) => e instanceof TypeError,
          "close function should not be bound to the resolved object",
        );
      });

      it("should let you get a function from the proxy, unbinding it, and then applying it with the proxy as this", async () => {
        let idDuringClose: number | undefined;

        const resolved = buildMockNetworkConnectionFrom({
          id: 99,
          async close() {
            idDuringClose = this.id;
          },
        });

        const proxy = createNetworkConnectionProxy(() => resolved);

        const closeFn = proxy.close;

        await closeFn.apply(proxy);
        assert.equal(idDuringClose, 99);
      });

      it("Should let you call functions with method syntax and set the `this` correctly", async () => {
        let idDuringClose: number | undefined;

        const resolved = buildMockNetworkConnectionFrom({
          id: 99,
          async close() {
            idDuringClose = this.id;
          },
        });

        const proxy = createNetworkConnectionProxy(() => resolved);

        await proxy.close();

        assert.equal(idDuringClose, 99);
      });
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
        "ethers",
        "networkConfig",
        "networkHelpers",
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
    describe("inspect and toString", () => {
      it("Should partially support `util.inspect`", () => {
        const proxy = createNetworkConnectionProxy(() => undefined);
        assert.equal(util.inspect(proxy), "[Function: NetworkConnectionProxy]");
      });

      it("Should support `toString`", () => {
        const proxy = createNetworkConnectionProxy(() => undefined);
        assert.equal(proxy.toString(), "<NetworkConnectionProxy>");
      });
    });

    it("should return a nested proxy for property (not undefined)", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      // The nested proxy is a truthy object, not undefined
      assert.ok(
        proxy.networkConfig !== undefined,
        "Expected nested proxy to not be undefined",
      );

      assert.equal(typeof proxy.networkConfig, "function");
    });

    it("should throw on set before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        () => {
          proxy.close = async () => {};
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for `in`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- trigger the has trap
          "id" in proxy;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for ownKeys", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        () => {
          Object.keys(proxy);
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for getOwnPropertyDescriptor", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      assertThrowsHardhatError(
        () => {
          Object.getOwnPropertyDescriptor(proxy, "id");
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
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

  describe("nested proxy (destructured before resolution, inspected before)", () => {
    describe("inspect and toString", () => {
      it("Should partially support `util.inspect`", () => {
        const proxy = createNetworkConnectionProxy(() => undefined);

        // Destructure while unresolved — captures a nested proxy
        const { networkConfig } = proxy;

        assert.equal(
          util.inspect(networkConfig),
          "[Function: NetworkConnectionPropertyProxy]",
        );
      });

      it("Should support `toString`", () => {
        const proxy = createNetworkConnectionProxy(() => undefined);

        // Destructure while unresolved — captures a nested proxy
        const { networkConfig } = proxy;

        assert.equal(
          networkConfig.toString(),
          "<NetworkConnectionPropertyProxy>",
        );
      });
    });
  });

  describe("nested proxy (destructured before resolution, used after)", () => {
    describe("inspect and toString", () => {
      // These tests are here to document the behavior that the proxy forces
      // on us, not because this is the ideal behavior
      it("Should partially support `util.inspect`", () => {
        // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
        let resolved: NetworkConnection | undefined;

        const proxy = createNetworkConnectionProxy(() => resolved);

        // Destructure while unresolved — captures a nested proxy
        const { networkConfig } = proxy;

        // Now resolve
        resolved = buildMockNetworkConnectionFrom({
          networkConfig: { gas: 9999n },
        });

        assert.equal(
          util.inspect(networkConfig),
          "[Function: NetworkConnectionPropertyProxy]",
        );
      });

      it("Should partially support `toString`", () => {
        // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
        let resolved: NetworkConnection | undefined;

        const proxy = createNetworkConnectionProxy(() => resolved);

        // Destructure while unresolved — captures a nested proxy
        const { networkConfig } = proxy;

        // Now resolve
        resolved = buildMockNetworkConnectionFrom({
          networkConfig: { gas: 9999n },
        });

        assert.equal(networkConfig.toString(), "[object Function]");
      });
    });

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

    describe("function properties", () => {
      it("should work with functions on the nested target", async () => {
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

      it("shouldn't bind functions on the nested target on get", async () => {
        // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
        let resolved: NetworkConnection | undefined;

        const proxy = createNetworkConnectionProxy(() => resolved);

        const { provider } = proxy;

        resolved = buildMockNetworkConnectionFrom({
          provider: {
            async request() {
              // This should throw because `this` should be undefined as we are
              // getting the function but not binding it
              return this.request?.name;
            },
          },
        });

        const requestFn = provider.request;

        await assertRejects(
          () => requestFn({ method: "eth_blockNumber" }),
          (e) => e instanceof TypeError,
          "close function should not be bound to the resolved object",
        );
      });

      it("should let you get a function from the proxy, unbinding it, and then applying it with the proxy as this", async () => {
        // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
        let resolved: NetworkConnection | undefined;

        const proxy = createNetworkConnectionProxy(() => resolved);

        const { provider } = proxy;

        resolved = buildMockNetworkConnectionFrom({
          provider: {
            async request() {
              // This should throw because `this` should be undefined as we are
              // getting the function but not binding it
              return this.request?.name;
            },
          },
        });

        const requestFn = provider.request;

        const response = await requestFn.apply(provider, [
          { method: "eth_blockNumber" },
        ]);

        assert.equal(response, "request");
      });

      it("Should let you call functions with method syntax and set the `this` correctly", async () => {
        // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
        let resolved: NetworkConnection | undefined;

        const proxy = createNetworkConnectionProxy(() => resolved);

        const { provider } = proxy;

        resolved = buildMockNetworkConnectionFrom({
          provider: {
            async request() {
              // This should throw because `this` should be undefined as we are
              // getting the function but not binding it
              return this.request?.name;
            },
          },
        });

        const response = await provider.request({ method: "eth_blockNumber" });

        assert.equal(response, "request");
      });
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
    it("should return a nested proxy on property access before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { provider } = proxy;

      // Before resolution, accessing a property returns a deeper proxy
      const nested = provider.request;

      assert.ok(
        nested !== undefined,
        "Expected nested proxy to not be undefined",
      );
      assert.equal(typeof nested, "function");
    });

    it("should throw on set with a helpful message", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally allow set to test edge case
          (networkConfig as any).chainId = 1;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for `in`", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- trigger the has trap
          "chainId" in networkConfig;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for ownKeys", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const { networkConfig } = proxy;

      assertThrowsHardhatError(
        () => {
          Object.keys(networkConfig);
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });
  });

  describe("deeply nested proxy (multi-level destructuring, used after resolution)", () => {
    it("should return a proxy at arbitrary depth before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const deep = proxy.networkHelpers.time.increase;

      assert.ok(
        deep !== undefined,
        "Expected deeply nested proxy to not be undefined",
      );
      assert.equal(typeof deep, "function");
    });

    it("should forward property access after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      // Capture a two-level deep proxy while unresolved
      const nested = proxy.ethers.BaseContract;

      resolved = buildMockNetworkConnectionFrom({
        ethers: { BaseContract: { name: "BaseContract" } },
      });

      // Accessing a property on the deep nested proxy resolves correctly
      assert.equal(nested.name, "BaseContract");
    });

    it("should bind functions after resolution", async () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const {
        provider: { request },
      } = proxy;

      resolved = buildMockNetworkConnectionFrom({
        provider: {
          request: async () => {
            return "deep-test-response";
          },
        },
      });

      assert.equal(
        await request({ method: "eth_blockNumber" }),
        "deep-test-response",
      );
    });

    it("should delegate set after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const nested = proxy.ethers.BaseContract;

      resolved = buildMockNetworkConnectionFrom({
        ethers: { BaseContract: { name: "BaseContract" } },
      });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing set on proxy
      (nested as any).name = "Modified";

      assert.equal(resolved.ethers.BaseContract.name, "Modified");
    });

    it("should delegate `in` after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const nested = proxy.ethers.BaseContract;

      resolved = buildMockNetworkConnectionFrom({
        ethers: { BaseContract: { name: "BaseContract" } },
      });

      assert.equal("name" in nested, true);
      assert.equal("missing" in nested, false);
    });

    it("should return keys from ownKeys after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const nested = proxy.ethers.BaseContract;

      resolved = buildMockNetworkConnectionFrom({
        ethers: { BaseContract: { name: "BaseContract" } },
      });

      assert.deepEqual(Object.keys(nested), ["name"]);
    });

    it("should delegate getOwnPropertyDescriptor after resolution", () => {
      // eslint-disable-next-line prefer-const -- intentionally reassigned after proxy captures the variable
      let resolved: NetworkConnection | undefined;

      const proxy = createNetworkConnectionProxy(() => resolved);

      const nested = proxy.ethers.BaseContract;

      resolved = buildMockNetworkConnectionFrom({
        ethers: { BaseContract: { name: "BaseContract" } },
      });

      const desc = Object.getOwnPropertyDescriptor(nested, "name");
      assert.equal(desc?.value, "BaseContract");
    });
  });

  describe("deeply nested proxy errors before resolution", () => {
    it("should throw on set before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const deep = proxy.ethers.BaseContract;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing set on proxy
          (deep as any).name = "x";
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for `in` before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const deep = proxy.ethers.BaseContract;

      assertThrowsHardhatError(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- trigger the has trap
          "name" in deep;
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for ownKeys before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const deep = proxy.ethers.BaseContract;

      assertThrowsHardhatError(
        () => {
          Object.keys(deep);
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });

    it("should throw for getOwnPropertyDescriptor before resolution", () => {
      const proxy = createNetworkConnectionProxy(() => undefined);

      const deep = proxy.ethers.BaseContract;

      assertThrowsHardhatError(
        () => {
          Object.getOwnPropertyDescriptor(deep, "name");
        },
        HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE.USE_BEFORE_HOOK,
        {},
      );
    });
  });
});

function buildMockNetworkConnectionFrom({
  id = 1,
  networkConfig = {
    gas: 1000n,
  },
  networkHelpers = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
    time: {
      duration: {},
    } as any,
  },
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
  ethers = {
    BaseContract: { name: "BaseContract" },
  } as any,
  provider = {
    request: async (_requestArguments: RequestArguments) => {},
  },
  close = async () => {},
  then = async () => {},
}: {
  id?: number;
  ethers?: any;
  networkConfig?: Partial<NetworkConfig>;
  networkHelpers?: Partial<NetworkHelpers<"generic">>;
  provider?: Partial<EthereumProvider>;
  close?: () => Promise<void>;
  then?: () => void;
}): NetworkConnection<"generic"> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing proxy behavior with plain objects
  return {
    id,
    ethers,
    networkConfig,
    networkHelpers,
    provider,
    close,
    then,
  } as any;
}
