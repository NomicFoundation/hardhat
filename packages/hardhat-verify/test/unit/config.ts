import type { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import type { EtherscanConfig } from "../../src/types";

import sinon from "sinon";
import { assert, expect } from "chai";

import { etherscanConfigExtender } from "../../src/internal/config";

describe("Chain Config", () => {
  it("should extend the hardhat config with the user config", async () => {
    const hardhatConfig = {} as HardhatConfig;
    const userConfig: HardhatUserConfig = {
      etherscan: {
        apiKey: {
          goerli: "<goerli-api-key>",
        },
        customChains: [
          {
            network: "goerli",
            chainId: 5,
            urls: {
              apiURL: "https://api-goerli.etherscan.io/api",
              browserURL: "https://goerli.etherscan.io",
            },
          },
        ],
      },
    };
    const expected: EtherscanConfig = {
      apiKey: {
        goerli: "<goerli-api-key>",
      },
      customChains: [
        {
          network: "goerli",
          chainId: 5,
          urls: {
            apiURL: "https://api-goerli.etherscan.io/api",
            browserURL: "https://goerli.etherscan.io",
          },
        },
      ],
    };
    etherscanConfigExtender(hardhatConfig, userConfig);

    assert.deepEqual(hardhatConfig.etherscan, expected);
  });

  it("should override the hardhat config with the user config", async () => {
    const hardhatConfig = {} as HardhatConfig;
    hardhatConfig.etherscan = {
      apiKey: {
        goerli: "<goerli-api-key>",
      },
      customChains: [
        {
          network: "goerli",
          chainId: 5,
          urls: {
            apiURL: "https://api-goerli.etherscan.io/api",
            browserURL: "https://goerli.etherscan.io",
          },
        },
      ],
    };
    const userConfig: HardhatUserConfig = {
      etherscan: {
        apiKey: {
          mainnet: "<mainnet-api-key>",
          sepolia: "<sepolia-api-key>",
        },
        customChains: [
          {
            network: "mainnet",
            chainId: 1,
            urls: {
              apiURL: "https://api.etherscan.io/api",
              browserURL: "https://etherscan.io",
            },
          },
          {
            network: "sepolia",
            chainId: 11155111,
            urls: {
              apiURL: "https://api-sepolia.etherscan.io/api",
              browserURL: "https://sepolia.etherscan.io",
            },
          },
        ],
      },
    };
    const expected: EtherscanConfig = {
      apiKey: {
        mainnet: "<mainnet-api-key>",
        sepolia: "<sepolia-api-key>",
      },
      customChains: [
        {
          network: "mainnet",
          chainId: 1,
          urls: {
            apiURL: "https://api.etherscan.io/api",
            browserURL: "https://etherscan.io",
          },
        },
        {
          network: "sepolia",
          chainId: 11155111,
          urls: {
            apiURL: "https://api-sepolia.etherscan.io/api",
            browserURL: "https://sepolia.etherscan.io",
          },
        },
      ],
    };
    etherscanConfigExtender(hardhatConfig, userConfig);

    assert.deepEqual(hardhatConfig.etherscan, expected);
  });

  it("should set default values when user config is not provided", async () => {
    const hardhatConfig = {} as HardhatConfig;
    const userConfig: HardhatUserConfig = {};
    const expected: EtherscanConfig = {
      apiKey: "",
      customChains: [],
    };
    etherscanConfigExtender(hardhatConfig, userConfig);

    assert.deepEqual(hardhatConfig.etherscan, expected);
  });

  it("should display a warning message if there is an etherscan entry in the networks object", async () => {
    const warnStub = sinon.stub(console, "warn");
    const hardhatConfig = {
      networks: {
        etherscan: {
          apiKey: {
            goerli: "<goerli-api-key>",
          },
        },
      },
    };
    const userConfig: HardhatUserConfig = {};

    // @ts-expect-error
    etherscanConfigExtender(hardhatConfig, userConfig);
    expect(warnStub).to.be.calledOnceWith(
      sinon.match(
        /WARNING: you have an 'etherscan' entry in your networks configuration./
      )
    );
    warnStub.restore();
  });
});
