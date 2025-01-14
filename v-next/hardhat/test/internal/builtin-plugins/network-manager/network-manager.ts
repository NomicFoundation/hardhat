import type { NetworkHooks } from "../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type {
  GenericChainType,
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
import { validateNetworkConfig } from "../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../src/internal/constants.js";
import { FixedValueConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

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
      accounts: [],
      url: new FixedValueConfigurationVariable("http://localhost:8545"),
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
      accounts: [],
      url: new FixedValueConfigurationVariable("http://node.customNetwork.com"),
      timeout: 20_000,
      httpHeaders: {},
    },
    myNetwork: {
      type: "http",
      chainId: undefined,
      chainType: OPTIMISM_CHAIN_TYPE,
      from: undefined,
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      accounts: [],
      url: new FixedValueConfigurationVariable("http://node.myNetwork.com"),
      timeout: 20_000,
      httpHeaders: {},
    },
  };

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
    networkManager = new NetworkManagerImplementation(
      "localhost",
      GENERIC_CHAIN_TYPE,
      networks,
      hre.hooks,
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
      const networkConnection = await networkManager.connect("customNetwork");
      assert.equal(networkConnection.networkName, "customNetwork");
      assert.equal(networkConnection.chainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.customNetwork);
    });

    it("should connect to the specified network and use it's chain type if none is provided and the network has a chain type", async () => {
      const networkConnection = await networkManager.connect("myNetwork");
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should connect to the specified network and chain type", async () => {
      const networkConnection = await networkManager.connect(
        "myNetwork",
        OPTIMISM_CHAIN_TYPE,
      );
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
      assert.deepEqual(networkConnection.networkConfig, networks.myNetwork);
    });

    it("should override the network's chain config with the specified chain config", async () => {
      const networkConnection = await networkManager.connect(
        "myNetwork",
        OPTIMISM_CHAIN_TYPE,
        { chainId: 1234 },
      );
      assert.equal(networkConnection.networkName, "myNetwork");
      assert.equal(networkConnection.chainType, OPTIMISM_CHAIN_TYPE);
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
        networkManager.connect("myNetwork", L1_CHAIN_TYPE, {
          type: L1_CHAIN_TYPE,
        } as any),
        HardhatError.ERRORS.NETWORK.INVALID_CONFIG_OVERRIDE,
        {
          errors: `\t* The type of the network cannot be changed.`,
        },
      );

      await assertRejectsWithHardhatError(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to test validation error */
        networkManager.connect("myNetwork", L1_CHAIN_TYPE, {
          type: undefined,
        } as any),
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
        networkManager.connect("myNetwork", OPTIMISM_CHAIN_TYPE, {
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
        networkManager.connect("myNetwork", L1_CHAIN_TYPE),
        HardhatError.ERRORS.NETWORK.INVALID_CHAIN_TYPE,
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
        const networkConnection = await networkManager.connect("localhost");
        expectTypeOf(networkConnection).toEqualTypeOf<
          NetworkConnection<GenericChainType>
        >();
      });

      it("should create a NetworkConnection with the provided chain type", async () => {
        const networkConnection = await networkManager.connect(
          "localhost",
          L1_CHAIN_TYPE,
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

  // TODO: Skipped for the alpha, but these tests need to be redone using the
  // assertValidationErrors, and also better structured.
  describe.skip("accounts", () => {
    const ACCOUNTS_ERROR = `Error in the "accounts" property in configuration:`;

    const HD_ACCOUNT_MNEMONIC_MSG = `${ACCOUNTS_ERROR} the "mnemonic" property of the HD account must be a string`;
    const HD_ACCOUNT_INITIAL_INDEX_MSG = `${ACCOUNTS_ERROR} the "initialIndex" property of the HD account must be an integer number`;
    const HD_ACCOUNT_COUNT_MSG = `${ACCOUNTS_ERROR} the "count" property of the HD account must be a positive integer number`;
    const HD_ACCOUNT_PATH_MSG = `${ACCOUNTS_ERROR} the "path" property of the HD account must be a string`;

    describe("http config", async () => {
      let networkConfig: any; // Use any to allow assigning also wrong values

      const validationErrorMsg = `The "accounts" property in the configuration should be set to one of the following values: "remote", an array of private keys, or an object containing account details such as mnemonic, initialIndex, count, path, and passphrase`;

      before(() => {
        networkConfig = {
          type: "http",
          gas: "auto",
          gasMultiplier: 1,
          gasPrice: "auto",
          url: "http://localhost:8545",
          timeout: 20_000,
          httpHeaders: {},
          accounts: "", // Modified in the tests
        };
      });

      describe("allowed values", () => {
        it("should allow the value 'remote'", async () => {
          networkConfig.accounts = "remote";

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });

        it("should allow an array of valid private keys", async () => {
          networkConfig.accounts = [
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          ];

          const validationErrors = validateNetworkConfig(networkConfig);
          console.log(validationErrors);
          assert.equal(validationErrors.length, 0);
        });

        it("should allow an account with a valid HttpNetworkHDAccountsConfig", async () => {
          networkConfig.accounts = {
            mnemonic: "asd asd asd",
            initialIndex: 0,
            count: 123,
            path: "m/123",
            passphrase: "passphrase",
          };

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });

        it("should allow valid private keys with missing hex prefix", async () => {
          networkConfig.accounts = [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ];

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });
      });

      describe("not allowed values", () => {
        describe("wrong private key formats", () => {
          it("should not allow hex literals", async () => {
            networkConfig.accounts = [
              0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
            ];

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `${ACCOUNTS_ERROR} the private key must be a string`,
            );
          });

          it("should not allow private keys of incorrect length", async () => {
            networkConfig.accounts = ["0xaaaa"];

            let validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `${ACCOUNTS_ERROR} the private key must be exactly 32 bytes long`,
            );

            networkConfig.accounts = [
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb",
            ];
            validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `${ACCOUNTS_ERROR} the private key must be exactly 32 bytes long`,
            );
          });

          it("should not allow invalid private keys", async () => {
            networkConfig.accounts = [
              "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
            ];

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `${ACCOUNTS_ERROR} the private key must contain only valid hexadecimal characters`,
            );
          });
        });
      });

      it("should fail with invalid types", async () => {
        const accountsValuesToTest = [123, [{}], { asd: 123 }];

        for (const accounts of accountsValuesToTest) {
          networkConfig.accounts = accounts;

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(validationErrors[0].message, validationErrorMsg);
        }
      });

      it("should fail with invalid HttpNetworkHDAccountsConfig", async () => {
        const accountsValuesToTest = [
          [{ mnemonic: 123 }, HD_ACCOUNT_MNEMONIC_MSG],
          [
            { mnemonic: "valid", initialIndex: "asd" },
            HD_ACCOUNT_INITIAL_INDEX_MSG,
          ],
          [
            { mnemonic: "valid", initialIndex: 1, count: "asd" },
            HD_ACCOUNT_COUNT_MSG,
          ],
          [
            { mnemonic: "valid", initialIndex: 1, count: 1, path: 123 },
            HD_ACCOUNT_PATH_MSG,
          ],
          [{ type: 123 }, validationErrorMsg],
          [
            {
              initialIndex: 1,
            },
            HD_ACCOUNT_MNEMONIC_MSG,
          ],
        ];

        for (const [accounts, error] of accountsValuesToTest) {
          networkConfig.accounts = accounts;

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(validationErrors[0].message, error);
        }
      });
    });

    describe("edr config", async () => {
      let networkConfig: any; // Use any to allow assigning also wrong values

      const validationErrorMsg = `The "accounts" property in the configuration should be set to one of the following values: an array of objects with 'privateKey' and 'balance', or an object containing account details such as mnemonic, initialIndex, count, path, accountsBalance, and passphrase`;

      before(() => {
        networkConfig = {
          type: "edr",
          chainId: 1,
          from: "0x0000",
          gas: "auto",
          gasMultiplier: 1,
          gasPrice: "auto",
          accounts: "", // Modified in the tests
        };
      });

      describe("allowed values", () => {
        it("should allow an array of account objects with valid private keys", async () => {
          networkConfig.accounts = [
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
          ];

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });

        it("should allow an account with a valid EdrNetworkHDAccountsConfig", async () => {
          networkConfig.accounts = {
            mnemonic: "asd asd asd",
            initialIndex: 0,
            count: 123,
            path: "m/1/2",
            accountsBalance: "123",
            passphrase: "passphrase",
          };

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });

        it("should allow valid private keys with missing hex prefix", async () => {
          networkConfig.accounts = [
            {
              balance: "123",
              privateKey:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            },
          ];

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.equal(validationErrors.length, 0);
        });
      });

      describe("not allowed values", () => {
        describe("wrong private key formats", () => {
          it("should not allow hex literals", async () => {
            networkConfig.accounts = [
              {
                balance: "123",
                privateKey: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
              },
            ];

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              "Expected a hex-encoded private key or a Configuration Variable",
            );
          });

          it("should not allow private keys of incorrect length", async () => {
            networkConfig.accounts = [
              {
                balance: "123",
                privateKey: "0xaaaa",
              },
            ];

            let validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `Expected a hex-encoded private key or a Configuration Variable`,
            );

            networkConfig.accounts = [
              {
                balance: "123",
                privateKey:
                  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb",
              },
            ];

            validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `Expected a hex-encoded private key or a Configuration Variable`,
            );
          });

          it("should not allow invalid private keys", async () => {
            networkConfig.accounts = [
              {
                balance: "123",
                privateKey:
                  "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
              },
            ];

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(
              validationErrors[0].message,
              `Expected a hex-encoded private key or a Configuration Variable`,
            );
          });
        });

        it("should not allow an array that contains a value that is not an object", async () => {
          networkConfig.accounts = [
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
          ];

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(validationErrors[0].message, validationErrorMsg);
        });

        it("should fail with invalid types", async () => {
          const accountsValuesToTest = [
            123,
            [{}],
            [
              {
                privateKey:
                  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              },
            ],
            [{ balance: "" }],
            [{ balance: 213 }],
            [{ privateKey: 123 }],
          ];

          for (const accounts of accountsValuesToTest) {
            networkConfig.accounts = accounts;

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(validationErrors[0].message, validationErrorMsg);
          }
        });

        it("should fail when the array of objects contains an invalid private key", async () => {
          networkConfig.accounts = [{ privateKey: "0xxxxx", balance: 213 }];

          const validationErrors = validateNetworkConfig(networkConfig);

          assert.notEqual(validationErrors.length, 0);
          assert.equal(
            validationErrors[0].message,
            `Expected a hex-encoded private key or a Configuration Variable`,
          );
        });

        it("should fail with invalid HD accounts", async () => {
          const accountsValuesToTest = [
            [{ mnemonic: 123 }, HD_ACCOUNT_MNEMONIC_MSG],
            [
              { mnemonic: "valid", initialIndex: "asd" },
              HD_ACCOUNT_INITIAL_INDEX_MSG,
            ],
            [
              { mnemonic: "valid", initialIndex: 1, count: "asd" },
              HD_ACCOUNT_COUNT_MSG,
            ],
            [
              { mnemonic: "valid", initialIndex: 1, count: 1, path: 123 },
              HD_ACCOUNT_PATH_MSG,
            ],
            [{ type: 123 }, validationErrorMsg],
          ];

          for (const [accounts, error] of accountsValuesToTest) {
            networkConfig.accounts = accounts;

            const validationErrors = validateNetworkConfig(networkConfig);

            assert.notEqual(validationErrors.length, 0);
            assert.equal(validationErrors[0].message, error);
          }
        });
      });
    });
  });
});
