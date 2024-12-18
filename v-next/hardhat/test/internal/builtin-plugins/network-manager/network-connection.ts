import type { EthereumProvider } from "../../../../src/types/providers.js";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpProvider } from "../../../../src/internal/builtin-plugins/network-manager/http-provider.js";
import { NetworkConnectionImplementation } from "../../../../src/internal/builtin-plugins/network-manager/network-connection.js";
import { FixedValueConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

describe("NetworkConnectionImplementation", () => {
  const localhostNetworkConfig: NetworkConfig = {
    type: "http",
    chainId: undefined,
    chainType: undefined,
    from: undefined,
    gas: "auto",
    gasMultiplier: 1,
    gasPrice: "auto",
    accounts: [],
    url: new FixedValueConfigurationVariable("http://localhost:8545"),
    timeout: 20_000,
    httpHeaders: {},
  };

  describe("NetworkConnectionImplementation.create", () => {
    it("should create a new network connection", async () => {
      let expectedProvider: EthereumProvider | undefined;

      const createProvider = async (): Promise<EthereumProvider> => {
        expectedProvider = await HttpProvider.create({
          url: await localhostNetworkConfig.url.getUrl(),
          networkName: "localhost",
          extraHeaders: localhostNetworkConfig.httpHeaders,
          timeout: localhostNetworkConfig.timeout,
        });

        return expectedProvider;
      };

      const closeConnection = async () => {};

      const networkConnection = await NetworkConnectionImplementation.create(
        1,
        "localhost",
        "generic",
        localhostNetworkConfig,
        closeConnection,
        createProvider,
      );

      assert.equal(networkConnection.id, 1);
      assert.equal(networkConnection.networkName, "localhost");
      assert.equal(networkConnection.chainType, "generic");
      assert.deepEqual(networkConnection.networkConfig, localhostNetworkConfig);
      assert.deepEqual(networkConnection.provider, expectedProvider);
    });
  });
});
