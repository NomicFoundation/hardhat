import type { NetworkConfig } from "../../../../src/types/config.js";
import type { EthereumProvider } from "../../../../src/types/providers.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpProvider } from "../../../../src/internal/builtin-plugins/network-manager/http-provider.js";
import { NetworkConnectionImplementation } from "../../../../src/internal/builtin-plugins/network-manager/network-connection.js";
import { GENERIC_CHAIN_TYPE } from "../../../../src/internal/constants.js";
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
        GENERIC_CHAIN_TYPE,
        localhostNetworkConfig,
        closeConnection,
        createProvider,
      );

      assert.equal(networkConnection.id, 1);
      assert.equal(networkConnection.networkName, "localhost");
      assert.equal(networkConnection.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, localhostNetworkConfig);
      assert.deepEqual(networkConnection.provider, expectedProvider);
    });
  });
});
