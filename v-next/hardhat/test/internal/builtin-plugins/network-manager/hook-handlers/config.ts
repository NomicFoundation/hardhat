import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type {
  HardhatConfig,
  HardhatUserConfig,
} from "@ignored/hardhat-vnext/types/config";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import {
  extendUserConfig,
  resolveUserConfig,
} from "../../../../../src/internal/builtin-plugins/network-manager/hook-handlers/config.js";
import { validateUserConfig } from "../../../../../src/internal/builtin-plugins/network-manager/type-validation.js";
import { ResolvedConfigurationVariableImplementation } from "../../../../../src/internal/core/configuration-variables.js";

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
        defaultChainType: "unknown",
        defaultNetwork: "localhost",
        networks: {
          localhost: {
            type: "http",
            chainId: 1337,
            chainType: "l1",
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

      const validationErrors = await validateUserConfig(config);

      assert.equal(validationErrors.length, 0);
    });

    it("should throw if the defaultChainType is not a valid chain type", async () => {
      const config = {
        defaultChainType: "invalid",
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected 'l1', 'optimism', or 'unknown'",
      );
    });

    it("should throw if the defaultNetwork is not a string", async () => {
      const config = {
        defaultNetwork: 123,
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected string, received number",
      );
    });

    it("should throw if the networks object is not a record", async () => {
      const config = {
        networks: 123,
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected object, received number",
      );
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
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Invalid discriminator value. Expected 'http' | 'edr'",
      );
    });

    it("should throw if the network type is missing", async () => {
      const config = {
        networks: {
          localhost: {},
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Invalid discriminator value. Expected 'http' | 'edr'",
      );
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
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected number, received string",
      );
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
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected 'l1', 'optimism', or 'unknown'",
      );
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
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected string, received number",
      );
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

      let validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithInvalidGas as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        `Invalid literal value, expected "auto"`,
      );

      const configWithNonSafeIntGas = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gas: Number.MAX_SAFE_INTEGER + 1,
          },
        },
      };

      validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNonSafeIntGas as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );

      assert.equal(
        validationErrors[0].message,
        "Number must be less than or equal to 9007199254740991",
      );

      const configWithNegativeGas = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gas: -100,
          },
        },
      };

      validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNegativeGas as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );

      assert.equal(
        validationErrors[0].message,
        "Number must be greater than 0",
      );
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
      const validationErrors = await validateUserConfig(config as any);

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        "Expected number, received string",
      );
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

      let validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithInvalidGasPrice as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );
      assert.equal(
        validationErrors[0].message,
        `Invalid literal value, expected "auto"`,
      );

      const configWithNonSafeIntGasPrice = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasPrice: Number.MAX_SAFE_INTEGER + 1,
          },
        },
      };

      validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNonSafeIntGasPrice as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );

      assert.equal(
        validationErrors[0].message,
        "Number must be less than or equal to 9007199254740991",
      );

      const configWithNegativeGasPrice = {
        networks: {
          localhost: {
            type: "http",
            url: "http://localhost:8545",
            gasPrice: -100,
          },
        },
      };

      validationErrors = await validateUserConfig(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- testing invalid network type for js users */
        configWithNegativeGasPrice as any,
      );

      assert.ok(
        validationErrors.length > 0,
        "validation errors should be present",
      );

      assert.equal(
        validationErrors[0].message,
        "Number must be greater than 0",
      );
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
        const validationErrors = await validateUserConfig(config as any);

        assert.ok(
          validationErrors.length > 0,
          "validation errors should be present",
        );
        assert.equal(
          validationErrors[0].message,
          "Expected a URL or a Configuration Variable",
        );
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
        const validationErrors = await validateUserConfig(config as any);

        assert.ok(
          validationErrors.length > 0,
          "validation errors should be present",
        );
        // TODO: the error message should be "Expected a URL or a Configuration Variable"
        assert.equal(validationErrors[0].message, "Invalid url");
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
        const validationErrors = await validateUserConfig(config as any);

        assert.ok(
          validationErrors.length > 0,
          "validation errors should be present",
        );
        assert.equal(
          validationErrors[0].message,
          "Expected number, received string",
        );
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

        let validationErrors = await validateUserConfig(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- testing invalid network type for js users */
          configWithStringHeaders as any,
        );

        assert.ok(
          validationErrors.length > 0,
          "validation errors should be present",
        );
        assert.equal(
          validationErrors[0].message,
          "Expected object, received string",
        );

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

        validationErrors = await validateUserConfig(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- testing invalid network type for js users */
          configWithInvalidHeaderValue as any,
        );

        assert.ok(
          validationErrors.length > 0,
          "validation errors should be present",
        );
        assert.equal(
          validationErrors[0].message,
          "Expected string, received number",
        );
      });
    });
  });

  describe("resolveUserConfig", () => {
    let hre: HardhatRuntimeEnvironment;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({});
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
      const resolveConfigurationVariable = () =>
        new ResolvedConfigurationVariableImplementation(hre.hooks, {
          name: "foo",
          _type: "ConfigurationVariable",
        });
      const next = async (
        nextUserConfig: HardhatUserConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
      ) => nextUserConfig as HardhatConfig;

      const resolvedConfig = await resolveUserConfig(
        extendedConfig,
        resolveConfigurationVariable,
        next,
      );

      assert.equal(resolvedConfig.defaultChainType, "unknown");
      assert.equal(resolvedConfig.defaultNetwork, "localhost");
      assert.deepEqual(resolvedConfig.networks, {
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
      });
    });

    it("should resolve with the user config", async () => {
      const userConfig: HardhatUserConfig = {
        // To change the defaultChainType, we need to augment the Hardhat types.
        // Since this can't be done for a single test, we'll leave this untested.
        defaultChainType: "unknown",
        defaultNetwork: "myNetwork",
        networks: {
          myNetwork: {
            type: "http",
            chainId: 1234,
            chainType: "l1",
            from: "0x123",
            gas: "auto",
            gasMultiplier: 1.5,
            gasPrice: 100n,
            url: "http://node.myNetwork.com",
            timeout: 10_000,
            httpHeaders: {
              "Content-Type": "application/json",
            },
          },
        },
      };
      const resolveConfigurationVariable = () =>
        new ResolvedConfigurationVariableImplementation(hre.hooks, {
          name: "foo",
          _type: "ConfigurationVariable",
        });
      const next = async (
        nextUserConfig: HardhatUserConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
      ) => nextUserConfig as HardhatConfig;

      const resolvedConfig = await resolveUserConfig(
        userConfig,
        resolveConfigurationVariable,
        next,
      );

      assert.equal(resolvedConfig.defaultChainType, "unknown");
      assert.equal(resolvedConfig.defaultNetwork, "myNetwork");
      assert.deepEqual(resolvedConfig.networks, {
        myNetwork: {
          type: "http",
          chainId: 1234,
          chainType: "l1",
          from: "0x123",
          gas: "auto",
          gasMultiplier: 1.5,
          gasPrice: 100n,
          url: "http://node.myNetwork.com",
          timeout: 10_000,
          httpHeaders: {
            "Content-Type": "application/json",
          },
        },
      });
    });
  });
});
