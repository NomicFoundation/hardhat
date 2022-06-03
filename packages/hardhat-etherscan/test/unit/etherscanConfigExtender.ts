import { assert } from "chai";
import { HardhatConfig } from "hardhat/types/config";
import { etherscanConfigExtender } from "../../src/config";

describe("Config extension", () => {
  it("should enforce a default config if none provided", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {});

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: "",
      customChains: [],
    });
  });

  it("copy across a string api key", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {
      etherscan: { apiKey: "example_token" },
    });

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: "example_token",
      customChains: [],
    });
  });

  it("copy across an etherscan api keys object", () => {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {
      etherscan: { apiKey: { ropsten: "example_token" } },
    });

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: { ropsten: "example_token" },
      customChains: [],
    });
  });

  it("should accept custom chains", async function () {
    const resolvedConfig = {} as HardhatConfig;
    etherscanConfigExtender(resolvedConfig, {
      etherscan: {
        apiKey: { ropsten: "example_token" },
        customChains: [
          {
            network: "My Chain",
            chainId: 12345,
            urls: {
              apiURL: "https://mychainscan.io/api",
              browserURL: "https://mychainscan.io",
            },
          },
        ],
      },
    });

    assert.deepStrictEqual(resolvedConfig.etherscan, {
      apiKey: { ropsten: "example_token" },
      customChains: [
        {
          network: "My Chain",
          chainId: 12345,
          urls: {
            apiURL: "https://mychainscan.io/api",
            browserURL: "https://mychainscan.io",
          },
        },
      ],
    });
  });
});
