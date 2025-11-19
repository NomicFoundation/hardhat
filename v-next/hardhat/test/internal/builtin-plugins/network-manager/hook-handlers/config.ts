import type {
  HardhatConfig,
  HardhatUserConfig,
} from "../../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { assertValidationErrors } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import {
  extendUserConfig,
  resolveUserConfig,
} from "../../../../../src/internal/builtin-plugins/network-manager/hook-handlers/config.js";
import { validateNetworkUserConfig } from "../../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
} from "../../../../../src/internal/constants.js";
import {
  FixedValueConfigurationVariable,
  resolveConfigurationVariable,
} from "../../../../../src/internal/core/configuration-variables.js";

describe("network-manager/hook-handlers/config", () => {
  describe("extendUserConfig", () => {
    it("should extend the user config with the localhost network", async () => {
      const config: HardhatUserConfig = {};
      const next = async (nextConfig: HardhatUserConfig) => nextConfig;

      const extendedConfig = await extendUserConfig(config, next);
      assert.ok(
        extendedConfig.networks?.localhost !== undefined,
        "localhost network should be defined",
      );
      assert.deepEqual(extendedConfig.networks?.localhost, {
        url: "http://localhost:8545",
        type: "http",
      });
    });

    it("should allow setting other properties of the localhost network", async () => {
      const config: HardhatUserConfig = {
        networks: {
          localhost: {
            url: "http://localhost:8545",
            type: "http",
            timeout: 10_000,
          },
        },
      };
      const next = async (nextConfig: HardhatUserConfig) => nextConfig;

      const extendedConfig = await extendUserConfig(config, next);
      assert.deepEqual(extendedConfig.networks?.localhost, {
        url: "http://localhost:8545",
        type: "http",
        timeout: 10_000,
      });
    });

    it("should allow overriding the url of the localhost network", async () => {
      const config: HardhatUserConfig = {
        networks: {
          localhost: {
            url: "http://localhost:1234",
            type: "http",
          },
        },
      };
      const next = async (nextConfig: HardhatUserConfig) => nextConfig;

      const extendedConfig = await extendUserConfig(config, next);
      assert.deepEqual(extendedConfig.networks?.localhost, {
        url: "http://localhost:1234",
        type: "http",
      });
    });

    it("should not allow overriding the type of the localhost network", async () => {
      const config = {
        networks: {
          localhost: {
            type: "http2",
          },
        },
      };
      const next = async (nextConfig: HardhatUserConfig) => nextConfig;

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const extendedConfig = await extendUserConfig(config as any, next);
      assert.deepEqual(extendedConfig.networks?.localhost, {
        url: "http://localhost:8545",
        type: "http",
      });
    });
  });

  describe("validateUserConfig", () => {
    it("should pass if the config is valid", async () => {
      const config: HardhatUserConfig = {
        defaultChainType: GENERIC_CHAIN_TYPE,
        networks: {
          localhost: {
            type: "http",
            chainId: 1337,
            chainType: L1_CHAIN_TYPE,
            from: "0x123",
            gas: "auto",
            gasMultiplier: 1.5,
            gasPrice: 100n,
            url: "http://localhost:8545",
            timeout: 10_000,
            httpHeaders: {
              "Content-Type": "application/json",
            },
          },
        },
      };

      const validationErrors = await validateNetworkUserConfig(config);

      assertValidationErrors(validationErrors, []);
    });

    it("should throw if the defaultChainType is not a valid chain type", async () => {
      const config = {
        defaultChainType: "invalid",
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["defaultChainType"],
          message: "Expected 'l1', 'op', or 'generic'",
        },
      ]);
    });

    it("should throw if the networks object is not a record", async () => {
      const config = {
        networks: 123,
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks"],
          message: "Expected object, received number",
        },
      ]);
    });

    it("should throw if the network type is not valid", async () => {
      const config = {
        networks: {
          localhost: {
            type: "invalid",
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "type"],
          message:
            "Invalid discriminator value. Expected 'http' | 'edr-simulated'",
        },
      ]);
    });

    it("should throw if the network type is missing", async () => {
      const config = {
        networks: {
          localhost: {},
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "type"],
          message:
            "Invalid discriminator value. Expected 'http' | 'edr-simulated'",
        },
      ]);
    });

    it("should throw if the chainId is invalid", async () => {
      const config = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            chainId: "invalid",
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "chainId"],
          message: "Expected number, received string",
        },
      ]);
    });

    it("should throw if the chainType is invalid", async () => {
      const config = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            chainType: "invalid",
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "chainType"],
          message: "Expected 'l1', 'op', or 'generic'",
        },
      ]);
    });

    it("should throw if the from is invalid", async () => {
      const config = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            from: 123,
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "from"],
          message: "Expected string, received number",
        },
      ]);
    });

    it("should throw if the gas is invalid", async () => {
      const configWithInvalidGas = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gas: "invalid",
          },
        },
      };

      let validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithInvalidGas as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gas"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);

      const configWithNonSafeIntGas = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gas: Number.MAX_SAFE_INTEGER + 1,
          },
        },
      };

      validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNonSafeIntGas as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gas"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);

      const configWithNegativeGas = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gas: -100,
          },
        },
      };

      validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNegativeGas as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gas"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);
    });

    it("should throw if the gasMultiplier is invalid", async () => {
      const config = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasMultiplier: "invalid",
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateNetworkUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gasMultiplier"],
          message: "Expected number, received string",
        },
      ]);
    });

    it("should throw if the gasPrice is invalid", async () => {
      const configWithInvalidGasPrice = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasPrice: "invalid",
          },
        },
      };

      let validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithInvalidGasPrice as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gasPrice"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);

      const configWithNonSafeIntGasPrice = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasPrice: Number.MAX_SAFE_INTEGER + 1,
          },
        },
      };

      validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNonSafeIntGasPrice as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gasPrice"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);

      const configWithNegativeGasPrice = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasPrice: -100,
          },
        },
      };

      validationErrors = await validateNetworkUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNegativeGasPrice as any,
      );

      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "localhost", "gasPrice"],
          message: "Expected 'auto', a positive safe int, or positive bigint",
        },
      ]);
    });

    it("should throw when mining interval is below 1000ms and allowBlocksWithSameTimestamp is false", async () => {
      const makeConfig = (
        interval: number | [number, number],
        allowBlocksWithSameTimestamp: boolean,
      ): HardhatUserConfig => ({
        networks: {
          test: {
            type: "edr-simulated",
            chainType: "l1",
            allowBlocksWithSameTimestamp,
            mining: {
              interval,
            },
          },
        },
      });

      const errorMessage =
        "mining.interval is set to less than 1000 ms. To avoid the block timestamp diverging from clock time, please set allowBlocksWithSameTimestamp: true on the network config";

      // Interval < 1000, allowBlocksWithSameTimestamp = false, error
      let validationErrors = await validateNetworkUserConfig(
        makeConfig(999, false),
      );
      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "test", "mining", "interval"],
          message: errorMessage,
        },
      ]);

      // Interval < 1000, allowBlocksWithSameTimestamp = true, no error
      validationErrors = await validateNetworkUserConfig(makeConfig(999, true));
      assert.equal(validationErrors.length, 0);

      // Interval >= 1000, allowBlocksWithSameTimestamp = false, no error
      validationErrors = await validateNetworkUserConfig(
        makeConfig(1000, false),
      );
      assert.equal(validationErrors.length, 0);

      // Interval range with min < 1000, allowBlocksWithSameTimestamp = false, error
      validationErrors = await validateNetworkUserConfig(
        makeConfig([1000, 999], false),
      );
      assertValidationErrors(validationErrors, [
        {
          path: ["networks", "test", "mining", "interval"],
          message: errorMessage,
        },
      ]);

      // // Interval range with min >= 1000, allowBlocksWithSameTimestamp = false, no error
      validationErrors = await validateNetworkUserConfig(
        makeConfig([1000, 1000], true),
      );
      assert.equal(validationErrors.length, 0);
    });

    describe("http network specific fields", () => {
      it("should throw if the url is missing", async () => {
        const config = {
          networks: {
            localhost: {
              type: "http",
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        const validationErrors = await validateNetworkUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "localhost", "url"],
            message: "Expected a URL or a Configuration Variable",
          },
        ]);
      });

      it("should throw if the url is invalid", async () => {
        const config = {
          networks: {
            localhost: {
              type: "http",
              url: "invalid",
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        const validationErrors = await validateNetworkUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "localhost", "url"],
            message: "Expected a URL or a Configuration Variable",
          },
        ]);
      });

      it("should throw if the timeout is invalid", async () => {
        const config = {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              timeout: "invalid",
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        const validationErrors = await validateNetworkUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "localhost", "timeout"],
            message: "Expected number, received string",
          },
        ]);
      });

      it("should throw if the httpHeaders is invalid", async () => {
        const configWithStringHeaders = {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              httpHeaders: "Content-Type: application/json",
            },
          },
        };

        let validationErrors = await validateNetworkUserConfig(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- testing invalid network type for js users */
          configWithStringHeaders as any,
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "localhost", "httpHeaders"],
            message: "Expected object, received string",
          },
        ]);

        const configWithInvalidHeaderValue = {
          networks: {
            localhost: {
              type: "http",
              url: "http://localhost:8545",
              httpHeaders: {
                "Content-Type": 123,
              },
            },
          },
        };

        validationErrors = await validateNetworkUserConfig(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- testing invalid network type for js users */
          configWithInvalidHeaderValue as any,
        );

        assertValidationErrors(validationErrors, [
          {
            path: ["networks", "localhost", "httpHeaders", "Content-Type"],
            message: "Expected string, received number",
          },
        ]);
      });
    });

    describe("accounts", () => {
      describe("http config", async () => {
        let hardhatUserConfig: any; // Use any to allow assigning also wrong values

        before(() => {
          hardhatUserConfig = {
            networks: {
              localhost: {
                type: "http",
                accounts: "", // Modified in the tests
                url: "http://localhost:8545",
              },
            },
          };
        });

        describe("allowed values", () => {
          it("should allow the value 'remote'", async () => {
            hardhatUserConfig.networks.localhost.accounts = "remote";

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });

          it("should allow an array of valid private keys", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            ];

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);
            assert.equal(validationErrors.length, 0);
          });

          it("should allow an account with a valid HttpNetworkHDAccountsConfig", async () => {
            hardhatUserConfig.networks.localhost.accounts = {
              mnemonic: "asd asd asd",
              initialIndex: 0,
              count: 123,
              path: "m/123",
              passphrase: "passphrase",
            };

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });

          it("should allow valid private keys with missing hex prefix", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ];

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });
        });

        describe("not allowed values", () => {
          describe("wrong private key formats", () => {
            it("should not allow hex literals", async () => {
              hardhatUserConfig.networks.localhost.accounts = [
                0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
              ];

              const validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow private keys of incorrect length", async () => {
              hardhatUserConfig.networks.localhost.accounts = ["0xaaaa"];

              let validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);

              hardhatUserConfig.networks.localhost.accounts = [
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabb",
              ];
              validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow invalid private keys", async () => {
              hardhatUserConfig.networks.localhost.accounts = [
                "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
              ];

              const validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });
          });
        });

        it("should fail with invalid types", async () => {
          hardhatUserConfig.networks.localhost.accounts = 123;
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts"],
                message:
                  "Expected 'remote', an array with private keys or Configuration Variables, or an object with HD account details",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = [{}];
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", 0],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = { asd: 123 };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "mnemonic"],
                message: "Expected a string or a Configuration Variable",
              },
            ],
          );
        });

        it("should fail with invalid HttpNetworkHDAccountsConfig", async () => {
          hardhatUserConfig.networks.localhost.accounts = { mnemonic: 123 };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "mnemonic"],
                message: "Expected a string or a Configuration Variable",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = {
            mnemonic: "valid",
            initialIndex: "asd",
          };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "initialIndex"],
                message: "Expected number, received string",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = {
            mnemonic: "valid",
            initialIndex: 1,
            count: "asd",
          };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "count"],
                message: "Expected number, received string",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = {
            mnemonic: "valid",
            initialIndex: 1,
            count: 1,
            path: 123,
          };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "path"],
                message: "Expected string, received number",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = { type: 123 };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "mnemonic"],
                message: "Expected a string or a Configuration Variable",
              },
            ],
          );

          hardhatUserConfig.networks.localhost.accounts = {
            initialIndex: 1,
          };
          assertValidationErrors(
            await validateNetworkUserConfig(hardhatUserConfig),
            [
              {
                path: ["networks", "localhost", "accounts", "mnemonic"],
                message: "Expected a string or a Configuration Variable",
              },
            ],
          );
        });
      });

      describe("edr config", async () => {
        let hardhatUserConfig: any; // Use any to allow assigning also wrong values

        before(() => {
          // TODO: This is a mixture of an EDR and an HTTP network
          hardhatUserConfig = {
            networks: {
              localhost: {
                chainId: 1,
                gas: "auto",
                gasMultiplier: 1,
                gasPrice: "auto",
                type: "edr-simulated",
                accounts: "", // Modified in the tests
                url: "http://localhost:8545",
              },
            },
          };
        });

        describe("allowed values", () => {
          it("should allow an array of account objects with valid private keys", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
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

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });

          it("should allow an account with a valid EdrNetworkHDAccountsConfig", async () => {
            hardhatUserConfig.networks.localhost.accounts = {
              mnemonic: "asd asd asd",
              initialIndex: 0,
              count: 123,
              path: "m/1/2",
              accountsBalance: "123",
              passphrase: "passphrase",
            };

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });

          it("should allow valid private keys with missing hex prefix", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
              {
                balance: "123",
                privateKey:
                  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              },
            ];

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, []);
          });
        });

        describe("not allowed values", () => {
          describe("wrong private key formats", () => {
            it("should not allow hex literals", async () => {
              hardhatUserConfig.networks.localhost.accounts = [
                {
                  balance: "123",
                  privateKey: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
                },
              ];

              const validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow private keys of incorrect length", async () => {
              hardhatUserConfig.networks.localhost.accounts = [
                {
                  balance: "123",
                  privateKey: "0xaaaa",
                },
              ];

              let validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);

              hardhatUserConfig.networks.localhost.accounts = [
                {
                  balance: "123",
                  privateKey:
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbb",
                },
              ];

              validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);
              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });

            it("should not allow invalid private keys", async () => {
              hardhatUserConfig.networks.localhost.accounts = [
                {
                  balance: "123",
                  privateKey:
                    "0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
                },
              ];

              const validationErrors =
                await validateNetworkUserConfig(hardhatUserConfig);

              assertValidationErrors(validationErrors, [
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ]);
            });
          });

          it("should not allow an array that contains a value that is not an object", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
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

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, [
              {
                path: ["networks", "localhost", "accounts", 1],
                message: "Expected object, received string",
              },
            ]);
          });

          it("should fail with invalid types", async () => {
            hardhatUserConfig.networks.localhost.accounts = 123;
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts"],
                  message:
                    "Expected an array with objects with private key and balance or Configuration Variables, or an object with HD account details",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = [{}];
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", 0, "balance"],
                  message: "Expected a string or a positive bigint",
                },
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = [
              {
                privateKey:
                  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              },
            ];
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", 0, "balance"],
                  message: "Expected a string or a positive bigint",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = [{ balance: "" }];
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = [{ balance: 213 }];
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", 0, "balance"],
                  message: "Expected a string or a positive bigint",
                },
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = [
              { privateKey: 123 },
            ];
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", 0, "balance"],
                  message: "Expected a string or a positive bigint",
                },
                {
                  path: ["networks", "localhost", "accounts", 0, "privateKey"],
                  message:
                    "Expected a hex-encoded private key or a Configuration Variable",
                },
              ],
            );
          });

          it("should fail when the array of objects contains an invalid private key", async () => {
            hardhatUserConfig.networks.localhost.accounts = [
              { privateKey: "0xxxxx", balance: 213 },
            ];

            const validationErrors =
              await validateNetworkUserConfig(hardhatUserConfig);

            assertValidationErrors(validationErrors, [
              {
                path: ["networks", "localhost", "accounts", 0, "privateKey"],
                message:
                  "Expected a hex-encoded private key or a Configuration Variable",
              },
              {
                path: ["networks", "localhost", "accounts", 0, "balance"],
                message: "Expected a string or a positive bigint",
              },
            ]);
          });

          it("should fail with invalid HD accounts", async () => {
            hardhatUserConfig.networks.localhost.accounts = { mnemonic: 123 };
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", "mnemonic"],
                  message: "Expected a string or a Configuration Variable",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = {
              mnemonic: "valid",
              initialIndex: "asd",
            };
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", "initialIndex"],
                  message: "Expected number, received string",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = {
              mnemonic: "valid",
              initialIndex: 1,
              count: "asd",
            };
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", "count"],
                  message: "Expected number, received string",
                },
              ],
            );

            hardhatUserConfig.networks.localhost.accounts = {
              mnemonic: "valid",
              initialIndex: 1,
              count: 1,
              path: 123,
            };
            assertValidationErrors(
              await validateNetworkUserConfig(hardhatUserConfig),
              [
                {
                  path: ["networks", "localhost", "accounts", "path"],
                  message: "Expected string, received number",
                },
              ],
            );
          });
        });
      });
    });
  });

  describe("resolveUserConfig", () => {
    let hre: HardhatRuntimeEnvironment;
    let next: (nextUserConfig: HardhatUserConfig) => Promise<HardhatConfig>;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({});
      next = async (
        nextUserConfig: HardhatUserConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
      ) => nextUserConfig as unknown as HardhatConfig;
    });

    it("should resolve an empty user config with the defaults", async () => {
      // This is how the user config looks like after it's been extended
      // by the extendUserConfig hook handler defined in the network-manager plugin.
      const extendedConfig: HardhatUserConfig = {
        networks: {
          localhost: {
            url: "http://localhost:8545",
            type: "http",
          },
        },
      };

      const resolvedConfig = await resolveUserConfig(
        extendedConfig,
        (variable) => resolveConfigurationVariable(hre.hooks, variable),
        next,
      );

      assert.equal(resolvedConfig.defaultChainType, GENERIC_CHAIN_TYPE);
      assert.deepEqual(resolvedConfig.networks, {
        localhost: {
          type: "http",
          chainId: undefined,
          chainType: undefined,
          from: undefined,
          gas: "auto",
          gasMultiplier: 1,
          gasPrice: "auto",
          accounts: "remote",
          url: new FixedValueConfigurationVariable("http://localhost:8545"),
          timeout: 300_000,
          httpHeaders: {},
        },
      });
    });

    it("should resolve with the user config", async () => {
      const userConfig: HardhatUserConfig = {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions 
        -- Type assertion needed because changing defaultChainType requires module 
        augmentation, which can't be done in test files */
        defaultChainType: L1_CHAIN_TYPE as any,
        networks: {
          myNetwork: {
            type: "http",
            chainId: 1234,
            chainType: L1_CHAIN_TYPE,
            from: "0x123",
            gas: "auto",
            gasMultiplier: 1.5,
            gasPrice: 100n,
            accounts: ["0x000006d4548a3ac17d72b372ae1e416bf65b8ead"],
            url: "http://node.myNetwork.com",
            timeout: 10_000,
            httpHeaders: {
              "Content-Type": "application/json",
            },
          },
        },
      };

      const resolvedConfig = await resolveUserConfig(
        userConfig,
        (variable) => resolveConfigurationVariable(hre.hooks, variable),
        next,
      );

      assert.equal(resolvedConfig.defaultChainType, L1_CHAIN_TYPE);
      assert.equal(resolvedConfig.networks.myNetwork.type, "http");
      assert.deepEqual(resolvedConfig.networks, {
        myNetwork: {
          type: "http",
          chainId: 1234,
          chainType: L1_CHAIN_TYPE,
          from: "0x123",
          gas: "auto",
          gasMultiplier: 1.5,
          gasPrice: 100n,
          accounts: [
            new FixedValueConfigurationVariable(
              "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
            ),
          ],
          url: new FixedValueConfigurationVariable("http://node.myNetwork.com"),
          timeout: 10_000,
          httpHeaders: {
            "Content-Type": "application/json",
          },
        },
      });
    });

    describe("accounts", () => {
      it("should normalize the accounts' private keys", async () => {
        const userConfig: HardhatUserConfig = {
          networks: {
            myNetwork: {
              type: "http",
              chainId: 1234,
              chainType: L1_CHAIN_TYPE,
              from: "0x123",
              gas: "auto",
              gasMultiplier: 1.5,
              gasPrice: 100n,
              accounts: [
                "0x000006d4548a3ac17d72b372ae1e416bf65b8AAA", // convert to lower case
                " 0x000006d4548a3ac17d72b372ae1e416bf65b8bbb", // remove space at the beginning
                "0x000006d4548a3ac17d72b372ae1e416bf65b8ccc  ", // remove space at the end
                "000006d4548a3ac17d72b372ae1e416bf65b8ddd", // add "0x" at the beginning
              ],
              url: "http://node.myNetwork.com",
              timeout: 10_000,
              httpHeaders: {
                "Content-Type": "application/json",
              },
            },
          },
        };

        const resolvedConfig = await resolveUserConfig(
          userConfig,
          (variable) => resolveConfigurationVariable(hre.hooks, variable),
          next,
        );

        assert.deepEqual(resolvedConfig.networks, {
          myNetwork: {
            type: "http",
            chainId: 1234,
            chainType: L1_CHAIN_TYPE,
            from: "0x123",
            gas: "auto",
            gasMultiplier: 1.5,
            gasPrice: 100n,
            accounts: [
              new FixedValueConfigurationVariable(
                "0x000006d4548a3ac17d72b372ae1e416bf65b8aaa",
              ),
              new FixedValueConfigurationVariable(
                "0x000006d4548a3ac17d72b372ae1e416bf65b8bbb",
              ),
              new FixedValueConfigurationVariable(
                "0x000006d4548a3ac17d72b372ae1e416bf65b8ccc",
              ),
              new FixedValueConfigurationVariable(
                "0x000006d4548a3ac17d72b372ae1e416bf65b8ddd",
              ),
            ],
            url: new FixedValueConfigurationVariable(
              "http://node.myNetwork.com",
            ),
            timeout: 10_000,
            httpHeaders: {
              "Content-Type": "application/json",
            },
          },
        });
      });

      it("should accept a valid partial HD account config", async () => {
        const userConfig: HardhatUserConfig = {
          networks: {
            myNetwork: {
              type: "http",
              chainId: 1234,
              chainType: L1_CHAIN_TYPE,
              from: "0x123",
              gas: "auto",
              gasMultiplier: 1.5,
              gasPrice: 100n,
              accounts: {
                mnemonic: "asd asd asd",
                passphrase: "passphrase",
              },
              url: "http://node.myNetwork.com",
              timeout: 10_000,
              httpHeaders: {
                "Content-Type": "application/json",
              },
            },
          },
        };

        const resolvedConfig = await resolveUserConfig(
          userConfig,
          (variable) => resolveConfigurationVariable(hre.hooks, variable),
          next,
        );

        assert.deepEqual(resolvedConfig.networks, {
          myNetwork: {
            type: "http",
            chainId: 1234,
            chainType: L1_CHAIN_TYPE,
            from: "0x123",
            gas: "auto",
            gasMultiplier: 1.5,
            gasPrice: 100n,
            accounts: {
              mnemonic: new FixedValueConfigurationVariable("asd asd asd"),
              initialIndex: 0,
              count: 20,
              path: "m/44'/60'/0'/0",
              passphrase: new FixedValueConfigurationVariable("passphrase"),
            },
            url: new FixedValueConfigurationVariable(
              "http://node.myNetwork.com",
            ),
            timeout: 10_000,
            httpHeaders: {
              "Content-Type": "application/json",
            },
          },
        });
      });
    });
  });
});
