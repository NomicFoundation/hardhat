import { assert } from "chai";
import { HardhatConfig } from "hardhat/types/config";
import { etherscanConfigExtender } from "../../src/config";

describe("Config extension", () => {
  it("should enforce a default config if none provided", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {});

    assert.deepStrictEqual(resolvedConfig.etherscan, { apiKey: "" });
  });

  it("copy across a string api key", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {
      etherscan: { apiKey: "example_token" },
    });

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: "example_token",
    });
  });

  it("copy across an etherscan api keys object", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {
      etherscan: { apiKey: { ropsten: "example_token" } },
    });

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: { ropsten: "example_token" },
    });
  });

  it("should error on providing unsupported api key", () => {
    assert.throws(() => {
      const resolvedConfig = {} as HardhatConfig;

      const invalidEtherscanConfig = {
        etherscan: {
          apiKey: {
            newhotness: "example_token",
          },
        },
      } as any;

      etherscanConfigExtender(resolvedConfig, invalidEtherscanConfig);
    }, 'Etherscan API token "newhotness" is for an unsupported network');
  });

  it("should error on providing multiple unsupported api keys", () => {
    assert.throws(() => {
      const resolvedConfig = {} as HardhatConfig;

      const invalidEtherscanConfig = {
        etherscan: {
          apiKey: {
            newhotness: "example_token",
            newhotness2: "example_token",
          },
        },
      } as any;

      etherscanConfigExtender(resolvedConfig, invalidEtherscanConfig);
    }, 'Etherscan API token "newhotness" is for an unsupported network');
  });
});
