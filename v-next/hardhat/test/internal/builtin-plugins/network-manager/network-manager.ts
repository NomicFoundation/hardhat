import type {
  ChainDescriptorsConfig,
  EdrNetworkConfigOverride,
  EdrNetworkUserConfig,
  HardhatUserConfig,
  HttpNetworkConfigOverride,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "../../../../src/types/config.js";
import type { NetworkHooks } from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type {
  GenericChainType,
  NetworkConnection,
  NetworkManager,
} from "../../../../src/types/network.js";
import type { ExpectedValidationError } from "@nomicfoundation/hardhat-test-utils";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertValidationErrors,
} from "@nomicfoundation/hardhat-test-utils";
import { expectTypeOf } from "expect-type";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import {
  resolveChainDescriptors,
  resolveEdrNetwork,
  resolveHttpNetwork,
} from "../../../../src/internal/builtin-plugins/network-manager/config-resolution.js";
import {
  L1HardforkName,
  OpHardforkName,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import { NetworkManagerImplementation } from "../../../../src/internal/builtin-plugins/network-manager/network-manager.js";
import { validateNetworkUserConfig } from "../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../src/internal/constants.js";
import {
  FixedValueConfigurationVariable,
  resolveConfigurationVariable,
} from "../../../../src/internal/core/configuration-variables.js";

describe("NetworkManagerImplementation", () => {
  let hre: HardhatRuntimeEnvironment;
  let networkManager: NetworkManager;
  let userNetworks: Record<string, NetworkUserConfig>;
  let networks: Record<string, NetworkConfig>;
  let chainDescriptors: ChainDescriptorsConfig;

  before(async () => {
    const initialDate = new Date();

    hre = await createHardhatRuntimeEnvironment({});

    userNetworks = {
      localhost: {
        type: "http",
        url: "http://localhost:8545",
      },
      customNetwork: {
        type: "http",
        url: "http://node.customNetwork.com",
      },
      myNetwork: {
        type: "http",
        chainType: OPTIMISM_CHAIN_TYPE,
        url: "http://node.myNetwork.com",
      },
      edrNetwork: {
        type: "edr",
        chainType: OPTIMISM_CHAIN_TYPE,
        initialDate,
        mining: {
          auto: true,
          mempool: {
            order: "priority",
          },
        },
      },
    };

    networks = {
      localhost: resolveHttpNetwork(
        {
          type: "http",
          url: "http://localhost:8545",
        },
        (varOrStr) => resolveConfigurationVariable(hre.hooks, varOrStr),
      ),
      customNetwork: resolveHttpNetwork(
        {
          type: "http",
          url: "http://node.customNetwork.com",
        },
        (varOrStr) => resolveConfigurationVariable(hre.hooks, varOrStr),
      ),
      myNetwork: resolveHttpNetwork(
        {
          type: "http",
          chainType: OPTIMISM_CHAIN_TYPE,
          url: "http://node.myNetwork.com",
        },
        (varOrStr) => resolveConfigurationVariable(hre.hooks, varOrStr),
      ),
      edrNetwork: resolveEdrNetwork(
        {
          type: "edr",
          chainType: OPTIMISM_CHAIN_TYPE,
          initialDate,
          mining: {
            auto: true,
            mempool: {
              order: "priority",
            },
          },
        },
        "",
        (varOrStr) => resolveConfigurationVariable(hre.hooks, varOrStr),
      ),
    };

    chainDescriptors = await resolveChainDescriptors(undefined);

    networkManager = new NetworkManagerImplementation(
      "localhost",
      GENERIC_CHAIN_TYPE,
      networks,
      hre.hooks,
      hre.artifacts,
      userNetworks,
      chainDescriptors,
    );
  });

  describe("connect", () => {
    it("should connect to the default network and chain type if none are provided", async () => {
      const networkConnection = await networkManager.connect();
      assert.equal(networkConnection.networkName, "localhost");
      assert.equal(networkConnection.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.localhost);
    });

    it("should connect to the specified network and default chain type if none are provided and the network doesn't have a chain type", async () => {
      const networkConnection = await networkManager.connect({
        network: "customNetwork",
      });
      assert.equal(networkConnection.networkName, "customNetwork");
      assert.equal(networkConnection.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.customNetwork);
    });

    it("should connect to the specified network and use it's chain type if none is provided and the network has a chain type", async () => {
      const networkConnection = await networkManager.connect({
        network: "myNetwork",
      });
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should connect to the specified network and chain type", async () => {
      const networkConnection = await networkManager.connect({
        network: "myNetwork",
        chainType: OPTIMISM_CHAIN_TYPE,
      });
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should override the network's chain config with the specified chain config", async () => {
      const httpConfigOverride: HttpNetworkConfigOverride = {
        chainId: 1234, // optional in the resolved config
        timeout: 30_000, // specific to http networks
      };
      let networkConnection = await networkManager.connect({
        network: "myNetwork",
        chainType: OPTIMISM_CHAIN_TYPE,
        override: httpConfigOverride,
      });
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, {
        ...networks.myNetwork,
        ...httpConfigOverride,
      });

      // Overriding the url is handled differently
      // so we need to test it separately
      networkConnection = await networkManager.connect({
        network: "myNetwork",
        chainType: OPTIMISM_CHAIN_TYPE,
        override: {
          url: "http://localhost:8545",
        },
      });
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, {
        ...networks.myNetwork,
        url: new FixedValueConfigurationVariable("http://localhost:8545"),
      });
    });

    it("should override the network's chain config with the specified chain config recursively", async () => {
      const edrConfigOverride: EdrNetworkConfigOverride = {
        mining: {
          mempool: {
            order: "fifo",
          },
        },
      };
      const networkConnection = await networkManager.connect({
        network: "edrNetwork",
        chainType: OPTIMISM_CHAIN_TYPE,
        override: edrConfigOverride,
      });

      assert.equal(networkConnection.networkName, "edrNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.equal(networks.edrNetwork.type, "edr"); // this is for the type assertion
      assert.deepEqual(networkConnection.networkConfig, {
        ...networks.edrNetwork,
        ...edrConfigOverride,
        mining: {
          ...networks.edrNetwork.mining,
          ...edrConfigOverride.mining,
          mempool: {
            ...networks.edrNetwork.mining.mempool,
            ...edrConfigOverride.mining?.mempool,
          },
        },
      });
    });

    it("should throw an error if the specified network doesn't exist", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect({ network: "unknownNetwork" }),
        HardhatError.ERRORS.CORE.NETWORK.NETWORK_NOT_FOUND,
        { networkName: "unknownNetwork" },
      );
    });

    it("should throw an error if the specified network config override tries to change the network's type", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect({
          network: "myNetwork",
          chainType: OPTIMISM_CHAIN_TYPE,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Cast to test validation error */
          override: {
            type: "edr",
          } as any,
        }),
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );

      await assertRejectsWithHardhatError(
        networkManager.connect({
          network: "myNetwork",
          chainType: OPTIMISM_CHAIN_TYPE,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Cast to test validation error */
          override: {
            type: undefined,
          } as any,
        }),
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );
    });

    it("should throw an error if the specified network config override is invalid", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect({
          network: "myNetwork",
          chainType: OPTIMISM_CHAIN_TYPE,
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Cast to test validation error */
          override: {
            chainId: "1234",
          } as any,
        }),
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* Error in chainId: Expected number, received string`,
        },
      );
    });

    it("should throw an error if the specified network config override has mixed properties from http and edr networks", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect({
          network: "myNetwork",
          chainType: OPTIMISM_CHAIN_TYPE,
          override: {
            url: "http://localhost:8545",
            hardfork: "cancun",
          },
        }),
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* Unrecognized key(s) in object: 'hardfork'`,
        },
      );
    });

    it("should throw an error if the specified chain type doesn't match the network's chain type", async () => {
      await assertRejectsWithHardhatError(
        networkManager.connect({
          network: "myNetwork",
          chainType: L1_CHAIN_TYPE,
        }),
        HardhatError.ERRORS.CORE.NETWORK.INVALID_CHAIN_TYPE,
        {
          networkName: "myNetwork",
          chainType: L1_CHAIN_TYPE,
          networkChainType: OPTIMISM_CHAIN_TYPE,
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
        const networkConnection = await networkManager.connect({
          network: "localhost",
        });
        expectTypeOf(networkConnection).toEqualTypeOf<
          NetworkConnection<GenericChainType>
        >();
      });

      it("should create a NetworkConnection with the provided chain type", async () => {
        const networkConnection = await networkManager.connect({
          network: "localhost",
          chainType: L1_CHAIN_TYPE,
        });
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
      } catch (_error) {}

      hre.hooks.unregisterHandlers("network", networkHooks);

      assert.ok(hookCalled, "The onRequest hook was not called");
    });
  });

  describe("config validation", () => {
    function httpConfig(
      partial: {
        [T in keyof HttpNetworkUserConfig]?: any;
      } = {},
    ): HardhatUserConfig {
      return {
        networks: {
          hardhat: {
            type: "http",
            url: "http://localhost:8545",
            ...partial,
          },
        },
      };
    }

    function edrConfig(
      partial: {
        [T in keyof EdrNetworkUserConfig]?: any;
      } = {},
    ): HardhatUserConfig {
      return {
        networks: {
          hardhat: {
            type: "edr",
            ...partial,
          },
        },
      };
    }

    describe("chainDescriptors", () => {
      it("should validate a valid network config", async () => {
        const validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            1: {
              name: "Ethereum",
              hardforkHistory: {
                london: { blockNumber: 456 },
              },
            },
            2: {
              name: "My Optimism Chain",
              chainType: OPTIMISM_CHAIN_TYPE,
              hardforkHistory: {
                bedrock: { blockNumber: 123 },
                regolith: { blockNumber: 456 },
                canyon: { timestamp: 1 },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, []);
      });

      it("should not validate an invalid network config", async () => {
        let validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            -- Cast to test validation error */
            123: true as any,
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123"],
            message: "Expected object, received boolean",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              -- Cast to test validation error */
              hardforkHistory: true as any,
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory"],
            message: "Expected object, received boolean",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            1: {
              name: "Ethereum",
              hardforkHistory: {
                london: { blockNumber: 123 },
              },
            },
            2: {
              name: "My Chain",
              hardforkHistory: {
                shanghai: { blockNumber: 456 },
                "random string": { blockNumber: 789 },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "2", "hardforkHistory", "random string"],
            message:
              "Invalid hardfork name random string found in chain descriptor for chain 2. Expected chainstart | homestead | dao | tangerineWhistle | spuriousDragon | byzantium | constantinople | petersburg | istanbul | muirGlacier | berlin | london | arrowGlacier | grayGlacier | merge | shanghai | cancun | prague.",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            1: {
              name: "My Optimism Chain",
              chainType: OPTIMISM_CHAIN_TYPE,
              hardforkHistory: {
                "random string": { blockNumber: 456 },
                bedrock: { blockNumber: 789 },
              },
            },
            2: {
              name: "My Chain",
              hardforkHistory: {
                london: { blockNumber: 123 },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "1", "hardforkHistory", "random string"],
            message:
              "Invalid hardfork name random string found in chain descriptor for chain 1. Expected bedrock | regolith | canyon | ecotone | fjord | granite | holocene.",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              hardforkHistory: {
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                -- Cast to test validation error */
                london: true as any,
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory", "london"],
            message:
              "Expected an object with either a blockNumber or a timestamp",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              hardforkHistory: {
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                -- Cast to test validation error */
                london: {
                  blockNumber: 123,
                  timestamp: 123,
                } as any,
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory", "london"],
            message: "Unrecognized key(s) in object: 'timestamp'",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              hardforkHistory: {
                london: {
                  blockNumber: 456,
                },
                cancun: {
                  blockNumber: 123,
                },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory", "cancun"],
            message:
              "Invalid block number 123 found in chain descriptor for chain 123. Block numbers must be in ascending order.",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              hardforkHistory: {
                london: {
                  timestamp: 456,
                },
                cancun: {
                  timestamp: 123,
                },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory", "cancun"],
            message:
              "Invalid timestamp 123 found in chain descriptor for chain 123. Timestamps must be in ascending order.",
          },
        ]);

        validationErrors = await validateNetworkUserConfig({
          chainDescriptors: {
            123: {
              name: "My Network",
              hardforkHistory: {
                london: {
                  timestamp: 456,
                },
                cancun: {
                  blockNumber: 123,
                },
              },
            },
          },
        });

        assertValidationErrors(validationErrors, [
          {
            path: ["chainDescriptors", "123", "hardforkHistory", "cancun"],
            message:
              "Invalid block number 123 found in chain descriptor for chain 123. Block number cannot be defined after a timestamp.",
          },
        ]);
      });
    });

    describe("accounts", () => {
      describe("http config", async () => {
        describe("allowed values", () => {
          it("should allow the value 'remote'", async () => {
            const validationErrors = await validateNetworkUserConfig(
              httpConfig({ accounts: "remote" }),
            );

            assertValidationErrors(validationErrors, []);
          });

          it("should allow an array of valid private keys", async () => {
            const validationErrors = await validateNetworkUserConfig(
              httpConfig({
                accounts: [
                  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                ],
              }),
            );

            assertValidationErrors(validationErrors, []);
          });

          it("should allow an account with a valid HttpNetworkHDAccountsConfig", async () => {
            const validationErrors = await validateNetworkUserConfig(
              httpConfig({
                accounts: {
                  mnemonic: "asd asd asd",
                  initialIndex: 0,
                  count: 123,
                  path: "m/123",
                  passphrase: "passphrase",
                },
              }),
            );

            assertValidationErrors(validationErrors, []);
          });

          it("should allow valid private keys with missing hex prefix", async () => {
            const validationErrors = await validateNetworkUserConfig(
              httpConfig({
                accounts: [
                  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                ],
              }),
            );

            assertValidationErrors(validationErrors, []);
          });
        });

        describe("not allowed values", () => {
          describe("wrong private key formats", () => {
            it("should not allow hex literals", async () => {
              const validationErrors = await validateNetworkUserConfig(
                httpConfig({
                  accounts: [
                    0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow private keys of incorrect length", async () => {
              const validationErrors = await validateNetworkUserConfig(
                httpConfig({
                  accounts: [
                    "0xaaaa",
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb",
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0],
                  message: `Expected a hex-encoded private key or a Configuration Variable`,
                },
                {
                  path: ["networks", "hardhat", "accounts", 1],
                  message: `Expected a hex-encoded private key or a Configuration Variable`,
                },
              ]);
            });

            it("should not allow invalid private keys", async () => {
              const validationErrors = await validateNetworkUserConfig(
                httpConfig({
                  accounts: [
                    "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });
          });
        });

        it("should fail with invalid types", async () => {
          const accounts = [123, [{}], { asd: 123 }];

          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ accounts }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "accounts", 0],
              message:
                "Expected a hex-encoded private key or a Configuration Variable",
            },
            {
              path: ["networks", "hardhat", "accounts", 1],
              message:
                "Expected a hex-encoded private key or a Configuration Variable",
            },
            {
              path: ["networks", "hardhat", "accounts", 2],
              message:
                "Expected a hex-encoded private key or a Configuration Variable",
            },
          ]);
        });

        it("should fail with invalid HttpNetworkHDAccountsConfig", async () => {
          const accountsValuesToTest: Array<[any, ExpectedValidationError[]]> =
            [
              [
                { mnemonic: 123 },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "mnemonic"],
                    message: "Expected a string or a Configuration Variable",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: "asd" },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "initialIndex"],
                    message: "Expected number, received string",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: 1, count: "asd" },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "count"],
                    message: "Expected number, received string",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: 1, count: 1, path: 123 },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "path"],
                    message: "Expected string, received number",
                  },
                ],
              ],
              [
                { type: 123 },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "mnemonic"],
                    message: "Expected a string or a Configuration Variable",
                  },
                ],
              ],
              [
                {
                  initialIndex: 1,
                },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "mnemonic"],
                    message: "Expected a string or a Configuration Variable",
                  },
                ],
              ],
            ];

          for (const [accounts, error] of accountsValuesToTest) {
            const validationErrors = await validateNetworkUserConfig(
              httpConfig({ accounts }),
            );

            assertValidationErrors(validationErrors, error);
          }
        });
      });

      describe("edr config", async () => {
        describe("allowed values", () => {
          it("should allow an array of account objects with valid private keys", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: [
                  {
                    balance: "123",
                    privateKey:
                      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  },
                  {
                    balance: "123",
                    privateKey:
                      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  },
                  {
                    balance: "123",
                    privateKey:
                      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                  },
                ],
              }),
            );

            assertValidationErrors(validationErrors, []);
          });

          it("should allow an account with a valid EdrNetworkHDAccountsConfig", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: {
                  mnemonic: "asd asd asd",
                  initialIndex: 0,
                  count: 123,
                  path: "m/1/2",
                  accountsBalance: "123",
                  passphrase: "passphrase",
                },
              }),
            );

            assertValidationErrors(validationErrors, []);
          });

          it("should allow valid private keys with missing hex prefix", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: [
                  {
                    balance: "123",
                    privateKey:
                      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  },
                ],
              }),
            );

            assertValidationErrors(validationErrors, []);
          });
        });

        describe("not allowed values", () => {
          describe("wrong private key formats", () => {
            it("should not allow hex literals", async () => {
              const validationErrors = await validateNetworkUserConfig(
                edrConfig({
                  accounts: [
                    {
                      balance: "123",
                      privateKey: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                    },
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow private keys of incorrect length", async () => {
              const validationErrors = await validateNetworkUserConfig(
                edrConfig({
                  accounts: [
                    {
                      balance: "123",
                      privateKey: "0xaaaa",
                    },
                    {
                      balance: "123",
                      privateKey:
                        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb",
                    },
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
                {
                  path: ["networks", "hardhat", "accounts", 1, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow invalid private keys", async () => {
              const validationErrors = await validateNetworkUserConfig(
                edrConfig({
                  accounts: [
                    {
                      balance: "123",
                      privateKey:
                        "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
                    },
                  ],
                }),
              );

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "hardhat", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });
          });

          it("should not allow an array that contains a value that is not an object", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: [
                  {
                    balance: "123",
                    privateKey:
                      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  },
                  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  {
                    balance: "123",
                    privateKey:
                      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                  },
                ],
              }),
            );

            assertValidationErrors(validationErrors, [
              {
                path: ["networks", "hardhat", "accounts", 1],
                message: "Expected object, received string",
              },
            ]);
          });

          it("should fail with invalid types", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: [
                  123,
                  {},
                  {
                    privateKey:
                      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  },
                  { balance: "" },
                  { balance: 213 },
                  { privateKey: 123 },
                ],
              }),
            );

            assertValidationErrors(validationErrors, [
              {
                path: ["networks", "hardhat", "accounts", 0],
                message: "Expected object, received number",
              },
              {
                path: ["networks", "hardhat", "accounts", 1, "balance"],
                message: "Expected a string or a positive bigint",
              },
              {
                path: ["networks", "hardhat", "accounts", 1, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
              {
                path: ["networks", "hardhat", "accounts", 2, "balance"],
                message: "Expected a string or a positive bigint",
              },
              {
                path: ["networks", "hardhat", "accounts", 3, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
              {
                path: ["networks", "hardhat", "accounts", 4, "balance"],
                message: "Expected a string or a positive bigint",
              },
              {
                path: ["networks", "hardhat", "accounts", 4, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
              {
                path: ["networks", "hardhat", "accounts", 5, "balance"],
                message: "Expected a string or a positive bigint",
              },
              {
                path: ["networks", "hardhat", "accounts", 5, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
            ]);
          });

          it("should fail when the array of objects contains an invalid private key", async () => {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({
                accounts: [{ privateKey: "0xxxxx", balance: 213n }],
              }),
            );

            assertValidationErrors(validationErrors, [
              {
                path: ["networks", "hardhat", "accounts", 0, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
            ]);
          });

          it("should fail with invalid HD accounts", async () => {
            const accountsValuesToTest: Array<
              [Partial<any>, ExpectedValidationError[]]
            > = [
              [
                { mnemonic: 123 },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "mnemonic"],
                    message: "Expected a string or a Configuration Variable",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: "asd" },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "initialIndex"],
                    message: "Expected number, received string",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: 1, count: "asd" },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "count"],
                    message: "Expected number, received string",
                  },
                ],
              ],
              [
                { mnemonic: "valid", initialIndex: 1, count: 1, path: 123 },
                [
                  {
                    path: ["networks", "hardhat", "accounts", "path"],
                    message: "Expected string, received number",
                  },
                ],
              ],
              // todo: is this expected? the zod type has every field optional, so passing an object with an unrelated field doesn't fail
              [
                { type: 123 },
                [
                  // {
                  //   path: ["networks", "hardhat", "accounts", "mnemonic"],
                  //   message: "Expected a string or a Configuration Variable",
                  // },
                ],
              ],
            ];

            for (const [accounts, error] of accountsValuesToTest) {
              const validationErrors = await validateNetworkUserConfig(
                edrConfig({ accounts }),
              );

              assertValidationErrors(validationErrors, error);
            }
          });
        });
      });
    });

    describe("type", () => {
      it("should validate a valid network config", async () => {
        let validationErrors = await validateNetworkUserConfig(httpConfig());

        assertValidationErrors(validationErrors, []);

        validationErrors = await validateNetworkUserConfig(edrConfig());

        assertValidationErrors(validationErrors, []);
      });
    });

    describe("chainId", () => {
      it("should validate a valid network config", async () => {
        let validationErrors = await validateNetworkUserConfig(
          httpConfig({ chainId: 1 }),
        );

        assertValidationErrors(validationErrors, []);

        validationErrors = await validateNetworkUserConfig(
          edrConfig({ chainId: 1 }),
        );

        assertValidationErrors(validationErrors, []);
      });

      it("should not validate a negative chainId", async () => {
        let validationErrors = await validateNetworkUserConfig(
          httpConfig({ chainId: -1 }),
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "hardhat", "chainId"],
            message: "Number must be greater than or equal to 0",
          },
        ]);

        validationErrors = await validateNetworkUserConfig(
          edrConfig({ chainId: -1 }),
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "hardhat", "chainId"],
            message: "Number must be greater than or equal to 0",
          },
        ]);
      });
    });

    describe("chainType", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ chainType: "l1" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ chainType: "op" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ chainType: "generic" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ chainType: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "chainType"],
              message: "Expected 'l1', 'op', or 'generic'",
            },
          ]);
        });
      });

      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ chainType: "l1" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ chainType: "op" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ chainType: "generic" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ chainType: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "chainType"],
              message: "Expected 'l1', 'op', or 'generic'",
            },
          ]);
        });
      });
    });

    describe("from", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ from: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ from: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "from"],
              message: "Expected string, received number",
            },
          ]);
        });
      });
    });

    describe("gas", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: "auto" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gas: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);
        });
      });

      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: "auto" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gas: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gas"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);
        });
      });
    });

    describe("gasMultiplier", () => {
      it("should validate a valid network config", async () => {
        let validationErrors = await validateNetworkUserConfig(
          httpConfig({ gasMultiplier: 1.5 }),
        );

        assertValidationErrors(validationErrors, []);

        validationErrors = await validateNetworkUserConfig(
          edrConfig({ gasMultiplier: 1.5 }),
        );

        assertValidationErrors(validationErrors, []);
      });

      it("should not validate an invalid network config", async () => {
        let validationErrors = await validateNetworkUserConfig(
          httpConfig({ gasMultiplier: -1.5 }),
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "hardhat", "gasMultiplier"],
            message: "Number must be greater than or equal to 0",
          },
        ]);

        validationErrors = await validateNetworkUserConfig(
          edrConfig({ gasMultiplier: -1.5 }),
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "hardhat", "gasMultiplier"],
            message: "Number must be greater than or equal to 0",
          },
        ]);
      });
    });

    describe("gasPrice", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: "auto" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ gasPrice: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);
        });
      });

      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: "auto" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ gasPrice: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "gasPrice"],
              message:
                "Expected 'auto', a positive safe int, or positive bigint",
            },
          ]);
        });
      });
    });

    /* HTTP specific fields below */

    describe("url", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ url: "http://localhost:8545" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ url: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "url"],
              message: "Expected a URL or a Configuration Variable",
            },
          ]);
        });
      });
    });

    describe("httpHeaders", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({
              httpHeaders: {
                "some-header": "some-value",
              },
            }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            httpConfig({ httpHeaders: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "httpHeaders"],
              message: "Expected object, received number",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            httpConfig({ httpHeaders: { "some-header": 123 } }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "httpHeaders", "some-header"],
              message: "Expected string, received number",
            },
          ]);
        });
      });
    });

    describe("timeout", () => {
      describe("http config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ timeout: 123 }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            httpConfig({ timeout: "123" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "timeout"],
              message: "Expected number, received string",
            },
          ]);
        });
      });
    });

    /* EDR specific fields below */

    describe("allowBlocksWithSameTimestamp", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowBlocksWithSameTimestamp: true }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowBlocksWithSameTimestamp: false }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowBlocksWithSameTimestamp: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "allowBlocksWithSameTimestamp"],
              message: "Expected boolean, received string",
            },
          ]);
        });
      });
    });

    describe("allowUnlimitedContractSize", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowUnlimitedContractSize: true }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowUnlimitedContractSize: false }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ allowUnlimitedContractSize: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "allowUnlimitedContractSize"],
              message: "Expected boolean, received string",
            },
          ]);
        });
      });
    });

    describe("blockGasLimit", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ blockGasLimit: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ blockGasLimit: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ blockGasLimit: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "blockGasLimit"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ blockGasLimit: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "blockGasLimit"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ blockGasLimit: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "blockGasLimit"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);
        });
      });
    });

    describe("coinbase", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ coinbase: "some string" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ coinbase: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "coinbase"],
              message: "Expected string, received number",
            },
          ]);
        });
      });
    });

    describe("forking", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({
              forking: {
                url: "https://someurl.com",
                enabled: true,
                blockNumber: 123,
                httpHeaders: {
                  "some-header": "some-value",
                },
              },
            }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ forking: { url: 123 } }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "forking", "url"],
              message: "Expected a URL or a Configuration Variable",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              forking: {
                url: "https://someurl.com",
                enabled: 123,
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "forking", "enabled"],
              message: "Expected boolean, received number",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              forking: {
                url: "https://someurl.com",
                blockNumber: "123",
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "forking", "blockNumber"],
              message: "Expected number, received string",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              forking: {
                url: "https://someurl.com",
                httpHeaders: 123,
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "forking", "httpHeaders"],
              message: "Expected object, received number",
            },
          ]);
        });
      });
    });

    describe("hardfork", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          for (const hardfork of Object.values(L1HardforkName)) {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({ hardfork }),
            );

            assertValidationErrors(validationErrors, []);
          }

          for (const hardfork of Object.values(OpHardforkName)) {
            const validationErrors = await validateNetworkUserConfig(
              edrConfig({ hardfork, chainType: OPTIMISM_CHAIN_TYPE }),
            );

            assertValidationErrors(validationErrors, []);
          }
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ hardfork: "anything else" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "hardfork"],
              message:
                "Invalid hardfork name anything else for chainType generic. Expected chainstart | homestead | dao | tangerineWhistle | spuriousDragon | byzantium | constantinople | petersburg | istanbul | muirGlacier | berlin | london | arrowGlacier | grayGlacier | merge | shanghai | cancun | prague.",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              chainType: OPTIMISM_CHAIN_TYPE,
              hardfork: "anything else",
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "hardfork"],
              message:
                "Invalid hardfork name anything else for chainType op. Expected bedrock | regolith | canyon | ecotone | fjord | granite | holocene.",
            },
          ]);
        });
      });
    });

    describe("initialBaseFeePerGas", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: 123 }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: 123n }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: 123, hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat"],
              message:
                "initialBaseFeePerGas is only valid for networks with EIP-1559. Try a newer hardfork or remove it.",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "initialBaseFeePerGas"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: -123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "initialBaseFeePerGas"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialBaseFeePerGas: -123n }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "initialBaseFeePerGas"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);
        });
      });
    });

    describe("initialDate", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialDate: "01/02/03" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialDate: new Date() }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ initialDate: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "initialDate"],
              message: "Expected a string or a Date",
            },
          ]);
        });
      });
    });

    describe("loggingEnabled", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ loggingEnabled: true }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ loggingEnabled: false }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ loggingEnabled: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "loggingEnabled"],
              message: "Expected boolean, received string",
            },
          ]);
        });
      });
    });

    describe("minGasPrice", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: 123, hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: 123n, hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: 123 }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat"],
              message:
                "minGasPrice is not valid for networks with EIP-1559. Try an older hardfork or remove it.",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: "incorrect", hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "minGasPrice"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: -123, hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "minGasPrice"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ minGasPrice: -123n, hardfork: "berlin" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "minGasPrice"],
              message: "Expected a positive safe int or a positive bigint",
            },
          ]);
        });
      });
    });

    describe("mining", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                auto: true,
                interval: 1234,
                mempool: {
                  order: "fifo",
                },
              },
            }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                auto: true,
                interval: [1234, 4567],
                mempool: {
                  order: "priority",
                },
              },
            }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                auto: "true",
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "mining", "auto"],
              message: "Expected boolean, received string",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                interval: "1234",
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "mining", "interval"],
              message: "Expected a number or an array of numbers",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                mempool: 123,
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "mining", "mempool"],
              message: "Expected object, received number",
            },
          ]);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({
              mining: {
                mempool: {
                  order: "something else",
                },
              },
            }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "mining", "mempool", "order"],
              message: "Expected 'fifo' or 'priority'",
            },
          ]);
        });
      });
    });

    describe("networkId", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ networkId: 123 }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ networkId: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "networkId"],
              message: "Expected number, received string",
            },
          ]);
        });
      });
    });

    describe("throwOnCallFailures", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnCallFailures: true }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnCallFailures: false }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnCallFailures: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "throwOnCallFailures"],
              message: "Expected boolean, received string",
            },
          ]);
        });
      });
    });

    describe("throwOnTransactionFailures", () => {
      describe("edr config", () => {
        it("should validate a valid network config", async () => {
          let validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnTransactionFailures: true }),
          );

          assertValidationErrors(validationErrors, []);

          validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnTransactionFailures: false }),
          );

          assertValidationErrors(validationErrors, []);
        });

        it("should not validate an invalid network config", async () => {
          const validationErrors = await validateNetworkUserConfig(
            edrConfig({ throwOnTransactionFailures: "incorrect" }),
          );

          assertValidationErrors(validationErrors, [
            {
              path: ["networks", "hardhat", "throwOnTransactionFailures"],
              message: "Expected boolean, received string",
            },
          ]);
        });
      });
    });
  });
});
