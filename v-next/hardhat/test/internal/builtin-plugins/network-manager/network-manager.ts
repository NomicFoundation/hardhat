import type { NetworkHooks } from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type {
  NetworkConnection,
  NetworkManager,
} from "../../../../src/types/network.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { expectTypeOf } from "expect-type";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { NetworkManagerImplementation } from "../../../../src/internal/builtin-plugins/network-manager/network-manager.js";

describe("NetworkManagerImplementation", () => {
  let hre: HardhatRuntimeEnvironment;
  let networkManager: NetworkManager;
  const networks: Record<string, NetworkConfig> = {
    localhost: {
      type: "http",
      chainId: undefined,
      chainType: undefined,
      from: undefined,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      url: "http://localhost:8545",
      timeout: 20_000,
      httpHeaders: {},
    },
    customNetwork: {
      type: "http",
      chainId: undefined,
      chainType: undefined,
      from: undefined,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      url: "http://node.customNetwork.com",
      timeout: 20_000,
      httpHeaders: {},
    },
    myNetwork: {
      type: "http",
      chainId: undefined,
      chainType: "optimism",
      from: undefined,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      url: "http://node.myNetwork.com",
      timeout: 20_000,
      httpHeaders: {},
    },
  };

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
    networkManager = new NetworkManagerImplementation(
      "localhost",
      "unknown",
      networks,
      hre.hooks,
    );
  });

  describe("connect", () => {
    it("should connect to the default network and chain type if none are provided", async () => {
      const networkConnection = await networkManager.connect();
      assert.equal(networkConnection.networkName, "localhost");
      assert.equal(networkConnection.chainType, "unknown");
      assert.deepEqual(networkConnection.networkConfig, networks.localhost);
    });

    it("should connect to the specified network and default chain type if none are provided and the network doesn't have a chain type", async () => {
      const networkConnection = await networkManager.connect("customNetwork");
      assert.equal(networkConnection.networkName, "customNetwork");
      assert.equal(networkConnection.chainType, "unknown");
      assert.deepEqual(networkConnection.networkConfig, networks.customNetwork);
    });

    it("should connect to the specified network and use it's chain type if none is provided and the network has a chain type", async () => {
      const networkConnection = await networkManager.connect("myNetwork");
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, "optimism");
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should connect to the specified network and chain type", async () => {
      const networkConnection = await networkManager.connect(
        "myNetwork",
        "optimism",
      );
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, "optimism");
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should override the network's chain config with the specified chain config", async () => {
      const networkConnection = await networkManager.connect(
        "myNetwork",
        "optimism",
        { chainId: 1234 },
      );
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, "optimism");
      assert.deepEqual(networkConnection.networkConfig, {
        ...networks.myNetwork,
        chainId: 1234,
      });
    });

    it("should throw an error if the specified network doesn't exist", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect("unknownNetwork"),
        HardhatError.ERRORS.NETWORK.NETWORK_NOT_FOUND,
        { networkName: "unknownNetwork" },
      );
    });

    it("should throw an error if the specified network config override tries to change the network's type", async () => {
      await assertRejectsWithHardhatError(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to test validation error */
        networkManager.connect("myNetwork", "l1", { type: "l1" } as any),
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );

      await assertRejectsWithHardhatError(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to test validation error */
        networkManager.connect("myNetwork", "l1", { type: undefined } as any),
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );
    });

    it("should throw an error if the specified network config override is invalid", async () => {
      await assertRejectsWithHardhatError(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to test validation error */
        networkManager.connect("myNetwork", "optimism", {
          chainId: "1234",
        } as any),
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* Error in chainId: Expected number, received string`,
        },
      );
    });

    it("should throw an error if the specified chain type doesn't match the network's chain type", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect("myNetwork", "l1"),
        HardhatError.ERRORS.NETWORK.INVALID_CHAIN_TYPE,
        {
          networkName: "myNetwork",
          chainType: "l1",
          networkChainType: "optimism",
        },
      );
    });

    describe("network -> newConnection hook", () => {
      it("should call the newConnection hook when connecting to a network", async () => {
        let hookCalled = false;
        const networkHooks: Partial<NetworkHooks> = {
          newConnection: async (context, next) => {
            hookCalled = true;
            return next(context);
          },
        };

        hre.hooks.registerHandlers("network", networkHooks);

        await networkManager.connect();

        hre.hooks.unregisterHandlers("network", networkHooks);

        assert.ok(hookCalled, "The newConnection hook was not called");
      });
    });

    describe("types", () => {
      it("should create a NetworkConnection with the default chain type when no chain type is provided", async () => {
        const networkConnection = await networkManager.connect("localhost");
        expectTypeOf(networkConnection).toEqualTypeOf<
          NetworkConnection<"unknown">
        >();
      });

      it("should create a NetworkConnection with the provided chain type", async () => {
        const networkConnection = await networkManager.connect(
          "localhost",
          "l1",
        );
        expectTypeOf(networkConnection).toEqualTypeOf<
          NetworkConnection<"l1">
        >();
      });
    });
  });

  describe("network -> closeConnection hook", () => {
    it("should call the closeConnection hook when closing a connection", async () => {
      let hookCalled = false;
      const networkHooks: Partial<NetworkHooks> = {
        closeConnection: async () => {
          hookCalled = true;
        },
      };

      hre.hooks.registerHandlers("network", networkHooks);

      const networkConnection = await networkManager.connect();
      await networkConnection.close();

      hre.hooks.unregisterHandlers("network", networkHooks);

      assert.ok(hookCalled, "The closeConnection hook was not called");
    });
  });

  describe("network -> onRequest hook", async () => {
    it("should call the onRequest hook when making a request", async () => {
      let hookCalled = false;
      const onRequest: NetworkHooks["onRequest"] = async (
        context,
        networkConnection,
        jsonRpcRequest,
        next,
      ) => {
        hookCalled = true;
        return next(context, networkConnection, jsonRpcRequest);
      };
      const networkHooks: Partial<NetworkHooks> = {
        onRequest,
      };

      hre.hooks.registerHandlers("network", networkHooks);

      const connection = await networkManager.connect();
      // This will fail because we don't have a local node running
      // but we don't care about the result, we just want to trigger the hook
      try {
        await connection.provider.request({
          method: "eth_chainId",
        });
      } catch (error) {}

      hre.hooks.unregisterHandlers("network", networkHooks);

      assert.ok(hookCalled, "The onRequest hook was not called");
    });
  });
});
