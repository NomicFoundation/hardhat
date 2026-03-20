import type { NetworkConnection, NetworkManager } from "hardhat/types/network";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";

import { createConnectToSingleton } from "../src/connect-on-before/create-connect-to-singleton.js";

// We capture the hooks registered by `connectToSingleton` so we can invoke
// them manually in the test, rather than relying on a real Mocha runtime.
let capturedBeforeHooks: Array<() => Promise<void>>;
let originalBefore: typeof globalThis.before;

describe("createConnectToSingleton", () => {
  beforeEach(() => {
    capturedBeforeHooks = [];
    originalBefore = globalThis.before;

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- mocking Mocha's before() for unit testing
    globalThis.before = ((beforeFn: () => Promise<void>) => {
      capturedBeforeHooks.push(beforeFn);
    }) as any;
  });

  afterEach(() => {
    globalThis.before = originalBefore;
  });

  describe("successful connection", () => {
    it("should resolve the proxy for all callers sharing the singleton", async () => {
      const mockConnection = buildMockConnection({ id: 42 });
      const mockNetworkManager = buildMockNetworkManager(
        async () => mockConnection,
      );

      const connectToSingleton = createConnectToSingleton(mockNetworkManager);

      const proxy1 = connectToSingleton();
      const proxy2 = connectToSingleton();

      // Both calls for the same key should return the same proxy.
      assert.equal(
        proxy1,
        proxy2,
        "Same singleton key should return the same proxy",
      );

      // Run the before hooks to resolve the connection.
      await capturedBeforeHooks[0]();
      await capturedBeforeHooks[1]();

      // The proxy should now forward to the real connection.
      assert.equal(proxy1.id, 42);
    });

    it("should only call connect() once for multiple callers", async () => {
      let connectCallCount = 0;
      const mockConnection = buildMockConnection();
      const mockNetworkManager = buildMockNetworkManager(async () => {
        connectCallCount++;
        return mockConnection;
      });

      const connectToSingleton = createConnectToSingleton(mockNetworkManager);

      connectToSingleton();
      connectToSingleton();
      connectToSingleton();

      // Run all three hooks.
      for (const hook of capturedBeforeHooks) {
        await hook();
      }

      assert.equal(
        connectCallCount,
        1,
        "connect() should be called exactly once for the same singleton key",
      );
    });
  });

  describe("key isolation", () => {
    it("should create separate singletons for different network names", async () => {
      let connectCallCount = 0;
      const mockNetworkManager = buildMockNetworkManager(async () => {
        connectCallCount++;
        return buildMockConnection({ id: connectCallCount });
      });

      const connectToSingleton = createConnectToSingleton(mockNetworkManager);

      const proxyA = connectToSingleton("networkA");
      const proxyB = connectToSingleton("networkB");

      assert.notEqual(
        proxyA,
        proxyB,
        "Different networks should get different proxies",
      );

      for (const hook of capturedBeforeHooks) {
        await hook();
      }

      assert.equal(
        connectCallCount,
        2,
        "connect() should be called once per unique key",
      );
      assert.equal(proxyA.id, 1);
      assert.equal(proxyB.id, 2);
    });
  });

  describe("error propagation", () => {
    it("should propagate a connect() rejection to all before hooks sharing the singleton", async () => {
      const connectError = new Error("network connection failed");

      const mockNetworkManager = buildMockNetworkManager(async () => {
        throw connectError;
      });
      const connectToSingleton = createConnectToSingleton(mockNetworkManager);

      // Simulate two test files both calling connectToSingleton() for the
      // same (default) network — they should share the same singleton entry.
      connectToSingleton();
      connectToSingleton();

      assert.equal(
        capturedBeforeHooks.length,
        2,
        "Two before hooks should be registered",
      );

      // Both hooks should reject with the same error instance.
      await assertRejects(
        capturedBeforeHooks[0](),
        (error) => error === connectError,
        "First hook should reject with the connect error",
      );
      await assertRejects(
        capturedBeforeHooks[1](),
        (error) => error === connectError,
        "Second hook should reject with the same connect error",
      );
    });
  });
});

function buildMockConnection({
  id = 1,
}: { id?: number } = {}): NetworkConnection {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- mock for testing
  return { id } as NetworkConnection;
}

function buildMockNetworkManager(
  connect: () => Promise<NetworkConnection>,
): NetworkManager {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- mock for testing
  return { connect } as NetworkManager;
}
