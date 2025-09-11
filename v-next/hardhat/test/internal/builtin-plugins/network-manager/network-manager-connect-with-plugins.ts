import type {
  ChainDescriptorsConfig,
  HardhatConfig,
  HardhatUserConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "../../../../src/types/config.js";
import type { ConfigHooks } from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { NetworkManager } from "../../../../src/types/network.js";
import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import {
  resolveChainDescriptors,
  resolveHttpNetwork,
} from "../../../../src/internal/builtin-plugins/network-manager/config-resolution.js";
import { NetworkManagerImplementation } from "../../../../src/internal/builtin-plugins/network-manager/network-manager.js";
import { GENERIC_CHAIN_TYPE } from "../../../../src/internal/constants.js";
import { resolveConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

const networkConfigAddingPlugin: HardhatPlugin = {
  id: "network-config-adding-plugin",
  hookHandlers: {
    config: async () => ({
      default: async () => {
        const handlers: Partial<ConfigHooks> = {
          extendUserConfig: async (
            config: HardhatUserConfig,
            next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
          ) => {
            const newConfig = await next(config);

            for (const network of Object.values(newConfig.networks ?? {})) {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                -- to enable the test */
              (network as any).pluginAddedProperties =
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  -- to enable the test */
                (network as any).pluginAddedProperties ?? [
                  "default-added-by-plugin",
                ];
            }

            return newConfig;
          },
          resolveUserConfig: async (
            userConfig,
            _resolveConfigurationVariable,
            next,
          ): Promise<HardhatConfig> => {
            const resolvedConfig = await next(
              userConfig,
              _resolveConfigurationVariable,
            );

            if (userConfig.networks === undefined) {
              return resolvedConfig;
            }

            const resolvedConfigCopy = { ...resolvedConfig };

            for (const [networkName, network] of Object.entries(
              resolvedConfigCopy.networks,
            )) {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- to enable the test
              (network as any).pluginAddedProperties =
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- to enable the test
                (userConfig.networks[networkName] as any)
                  .pluginAddedProperties ?? [];
            }

            return resolvedConfig;
          },
        };

        return handlers;
      },
    }),
  },
};

describe("NetworkManagerImplementation", () => {
  let hre: HardhatRuntimeEnvironment;
  let networkManager: NetworkManager;
  let userNetworks: Record<string, NetworkUserConfig>;
  let networks: Record<string, NetworkConfig>;
  let chainDescriptors: ChainDescriptorsConfig;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      plugins: [networkConfigAddingPlugin],
    });

    userNetworks = {
      pluginExtendedNetwork: {
        type: "http",
        url: "http://node.pluginExtendedNetwork.com",
      },
    };

    networks = {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- to enable the test of plugin extension. */
      pluginExtendedNetwork: {
        ...resolveHttpNetwork(
          {
            type: "http",
            url: "http://node.pluginExtendedNetwork.com",
          },
          (varOrStr) => resolveConfigurationVariable(hre.hooks, varOrStr),
        ),
        pluginAddedProperties: ["default-added-by-plugin"],
      } as any,
    };

    chainDescriptors = await resolveChainDescriptors(undefined);

    networkManager = new NetworkManagerImplementation(
      "localhost",
      GENERIC_CHAIN_TYPE,
      networks,
      hre.hooks,
      hre.artifacts,
      { networks: userNetworks },
      chainDescriptors,
    );
  });

  describe("connect when config has been extended by plugins", () => {
    // Test default where we connect with no overrides,
    // the additional properties are added from the plugin
    it("should keep extensions to network config that plugins have added", async () => {
      const networkConnection = await networkManager.connect({
        network: "pluginExtendedNetwork",
      });

      assertPluginPropertiesCopied(networkConnection.networkConfig, {
        pluginAddedProperties: ["default-added-by-plugin"],
      });
    });

    // Test with overrides - but not providing those from the plugin
    it("should re-extend config when a user override is provided", async () => {
      const networkConnection = await networkManager.connect({
        network: "pluginExtendedNetwork",
        override: {
          timeout: 12,
        },
      });

      assertPluginPropertiesCopied(networkConnection.networkConfig, {
        pluginAddedProperties: ["default-added-by-plugin"],
      });
    });

    it("should re-extend config based on user provided values", async () => {
      const networkConnection = await networkManager.connect({
        network: "pluginExtendedNetwork",
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- to enable the test of plugin extension. */
        override: {
          pluginAddedProperties: ["my-value"],
        } as any,
      });

      assertPluginPropertiesCopied(networkConnection.networkConfig, {
        pluginAddedProperties: ["my-value"],
      });
    });
  });
});

function assertPluginPropertiesCopied(
  networkConfig: NetworkConfig,
  expectedOverride: { pluginAddedProperties: string[] },
) {
  if (!("pluginAddedProperties" in networkConfig)) {
    return assert.fail(
      "pluginAddedProperties from the plugin should be available in the network config",
    );
  }

  assert.deepEqual(
    networkConfig.pluginAddedProperties,
    expectedOverride.pluginAddedProperties,
  );
}
