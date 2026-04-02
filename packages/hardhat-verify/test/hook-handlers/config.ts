import type { HardhatUserConfig } from "hardhat/config";
import type {
  HardhatConfig,
  ResolvedConfigurationVariable,
} from "hardhat/types/config";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { assertValidationErrors } from "@nomicfoundation/hardhat-test-utils";

import {
  resolveUserConfig,
  validateUserConfig,
} from "../../src/internal/hook-handlers/config.js";
import { MockResolvedConfigurationVariable } from "../utils.js";

describe("hook-handlers/config", () => {
  describe("validateUserConfig", () => {
    it("should pass if the config is valid", async () => {
      const config = {
        verify: {
          blockscout: {
            enabled: true,
          },
          etherscan: {
            apiKey: "some-api-key",
            enabled: true,
          },
        },
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assertValidationErrors(validationErrors, []);
    });

    it("should throw if verify is not an object", async () => {
      const config = {
        verify: "invalid",
      };

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
      const validationErrors = await validateUserConfig(config as any);

      assertValidationErrors(validationErrors, [
        {
          path: ["verify"],
          message: "Expected object, received string",
        },
      ]);
    });

    describe("blockscout", () => {
      it("should pass if the apiKey is not provided", async () => {
        const config = {
          verify: {
            blockscout: {},
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, []);
      });

      it("should throw if blockscout is not an object", async () => {
        const config = {
          verify: {
            blockscout: "invalid",
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "blockscout"],
            message: "Expected object, received string",
          },
        ]);
      });

      it("should throw if enabled is not a boolean", async () => {
        const config = {
          verify: {
            blockscout: {
              enabled: "not-a-boolean",
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "blockscout", "enabled"],
            message: "Expected boolean, received string",
          },
        ]);
      });
    });

    describe("etherscan", () => {
      it("should pass if the config is valid", async () => {
        let config: HardhatUserConfig = {
          verify: {
            etherscan: {
              apiKey: "some-api-key",
              enabled: true,
            },
          },
        };

        let validationErrors = await validateUserConfig(config);

        assertValidationErrors(validationErrors, []);

        config = {
          verify: {
            etherscan: {
              apiKey: "some-api-key",
            },
          },
        };

        validationErrors = await validateUserConfig(config);

        assertValidationErrors(validationErrors, []);

        config = {
          verify: {
            etherscan: {
              apiKey: "some-api-key",
              enabled: false,
            },
          },
        };

        validationErrors = await validateUserConfig(config);

        assertValidationErrors(validationErrors, []);

        config = {
          verify: {
            etherscan: {
              enabled: false,
            },
          },
        };

        validationErrors = await validateUserConfig(config);

        assertValidationErrors(validationErrors, []);
      });

      it("should throw if etherscan is not an object", async () => {
        const config = {
          verify: {
            etherscan: "invalid",
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "etherscan"],
            message:
              "Expected an object with an 'apiKey' property and an optional 'enabled' boolean property",
          },
        ]);
      });

      it("should throw if apiKey is missing and enabled is undefined", async () => {
        const config = {
          verify: {
            etherscan: {},
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "etherscan", "apiKey"],
            message: "Expected a string or a Configuration Variable",
          },
        ]);
      });

      it("should throw if apiKey is missing and enabled is true", async () => {
        const config = {
          verify: {
            etherscan: {
              enabled: true,
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "etherscan", "apiKey"],
            message: "Expected a string or a Configuration Variable",
          },
        ]);
      });

      it("should throw if apiKey is not a string", async () => {
        const config = {
          verify: {
            etherscan: {
              apiKey: 1,
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "etherscan", "apiKey"],
            message: "Expected a string or a Configuration Variable",
          },
        ]);
      });

      it("should throw if enabled is not a boolean", async () => {
        const config = {
          verify: {
            etherscan: {
              apiKey: "some-api-key",
              enabled: "not-a-boolean",
            },
          },
        };

        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- testing invalid network type for js users */
        const validationErrors = await validateUserConfig(config as any);

        assertValidationErrors(validationErrors, [
          {
            path: ["verify", "etherscan"],
            message:
              "Expected an object with an 'apiKey' property and an optional 'enabled' boolean property",
          },
        ]);
      });
    });
  });

  describe("resolveUserConfig", () => {
    let next: (nextUserConfig: HardhatUserConfig) => Promise<HardhatConfig>;
    let configurationVariableResolver: (
      variable: string,
    ) => ResolvedConfigurationVariable;

    before(async () => {
      next = async (
        nextUserConfig: HardhatUserConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
      ) => nextUserConfig as unknown as HardhatConfig;
      configurationVariableResolver = (variable) =>
        new MockResolvedConfigurationVariable(variable);
    });

    it("should resolve an undefined user config with the defaults", async () => {
      const resolvedConfig = await resolveUserConfig(
        {},
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
        (variable) => configurationVariableResolver(variable as string),
        next,
      );

      assert.deepEqual(resolvedConfig.verify, {
        blockscout: {
          enabled: true,
        },
        etherscan: {
          apiKey: new MockResolvedConfigurationVariable(""),
          enabled: true,
        },
        sourcify: {
          apiUrl: undefined,
          enabled: true,
        },
      });
    });

    it("should resolve with the user config", async () => {
      const userConfig: HardhatUserConfig = {
        verify: {
          blockscout: {
            enabled: false,
          },
          etherscan: {
            apiKey: "some-api-key",
            enabled: false,
          },
          sourcify: {
            apiUrl: "https://sourcify.custom.url",
            enabled: false,
          },
        },
      };

      const resolvedConfig = await resolveUserConfig(
        userConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
        (variable) => configurationVariableResolver(variable as string),
        next,
      );

      assert.deepEqual(resolvedConfig.verify, {
        blockscout: {
          enabled: false,
        },
        etherscan: {
          apiKey: new MockResolvedConfigurationVariable("some-api-key"),
          enabled: false,
        },
        sourcify: {
          apiUrl: "https://sourcify.custom.url",
          enabled: false,
        },
      });
    });

    it("should default enabled to true if not provided", async () => {
      const userConfig: HardhatUserConfig = {
        verify: {
          blockscout: {},
          etherscan: {
            apiKey: "some-api-key",
          },
          sourcify: {
            apiUrl: "https://sourcify.custom.url",
          },
        },
      };

      const resolvedConfig = await resolveUserConfig(
        userConfig,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast for simplicity as we won't test this */
        (variable) => configurationVariableResolver(variable as string),
        next,
      );

      assert.deepEqual(resolvedConfig.verify, {
        blockscout: {
          enabled: true,
        },
        etherscan: {
          apiKey: new MockResolvedConfigurationVariable("some-api-key"),
          enabled: true,
        },
        sourcify: {
          apiUrl: "https://sourcify.custom.url",
          enabled: true,
        },
      });
    });
  });
});
