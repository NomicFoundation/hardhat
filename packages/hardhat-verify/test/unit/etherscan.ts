import type { EthereumProvider } from "hardhat/types";
import type { ChainConfig } from "../../src/types";

import { assert, expect } from "chai";
import sinon, { SinonStub } from "sinon";
import { Etherscan } from "../../src/internal/etherscan";
import * as undici from "../../src/internal/undici";

describe("Etherscan", () => {
  const chainConfig = {
    network: "goerli",
    chainId: 5,
    urls: {
      apiURL: "https://api-goerli.etherscan.io/api",
      browserURL: "https://goerli.etherscan.io",
    },
  };

  let warnStub: SinonStub;
  let sendGetRequestStub: SinonStub;
  let sendPostRequestStub: SinonStub;

  beforeEach(() => {
    warnStub = sinon.stub(console, "warn");
    sendGetRequestStub = sinon.stub(undici, "sendGetRequest");
    sendPostRequestStub = sinon.stub(undici, "sendPostRequest");
  });

  afterEach(() => {
    warnStub.restore();
    sendGetRequestStub.restore();
    sendPostRequestStub.restore();
  });

  describe("constructor", () => {
    it("should throw if the apiKey is undefined or empty", () => {
      expect(() => Etherscan.fromChainConfig(undefined, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => Etherscan.fromChainConfig("", chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });

    it("should throw if the apiKey is an object but apiKey[network] is undefined or empty", () => {
      expect(() => Etherscan.fromChainConfig({}, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() =>
        Etherscan.fromChainConfig({ goerli: "" }, chainConfig)
      ).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });

    it("resolves apiUrl to etherscan v2 if chain id is specified", async () => {
      expect(
        new Etherscan("api_key", "api_url", "browser_url", 5).apiUrl
      ).to.equal("https://api.etherscan.io/v2/api");
    });

    it("uses apiUrl parameter if chain id is not specified", async () => {
      expect(
        new Etherscan("api_key", "api_url", "browser_url", undefined).apiUrl
      ).to.equal("api_url");
    });
  });

  describe("fromChainConfig", () => {
    it("warns if apiKey config var is an object", async () => {
      Etherscan.fromChainConfig({ goerli: "<api-key>" }, chainConfig);

      expect(warnStub).to.be.calledOnceWith(
        sinon.match(
          /Network and explorer-specific api keys are deprecated in favour of the new Etherscan v2 api/
        )
      );
    });

    it("doesnt warn if apiKey config var is a string", async () => {
      Etherscan.fromChainConfig("<api-key>", chainConfig);

      expect(warnStub).to.be.callCount(0);
    });

    it("passes chain id to Etherscan constructor if apiKey is a string (treated as v2 api)", async () => {
      const etherscan = Etherscan.fromChainConfig("<api-key>", chainConfig);
      expect(etherscan.chainId).to.equal(5);
    });

    it("doesnt pass chain id to Etherscan constructor if apiKey is an object (treated as v1 api)", async () => {
      const etherscan = Etherscan.fromChainConfig(
        { goerli: "<api-key>" },
        chainConfig
      );
      expect(etherscan.chainId).to.equal(undefined);
    });
  });

  describe("getCurrentChainConfig", () => {
    const customChains: ChainConfig[] = [
      {
        network: "customChain1",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain2",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain3",
        chainId: 4999,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
    ];

    it("should return the last matching custom chain defined by the user", async function () {
      const networkName = "customChain2";
      const ethereumProvider = {
        async send() {
          return (5000).toString(16);
        },
      } as unknown as EthereumProvider;

      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        customChains
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 5000);
    });

    it("should return a built-in chain if no custom chain matches", async function () {
      const networkName = "goerli";
      const ethereumProvider = {
        async send() {
          return (5).toString(16);
        },
      } as unknown as EthereumProvider;
      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        customChains
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 5);
    });

    it("should throw if the selected network is hardhat and it's not added to custom chains", async () => {
      const networkName = "hardhat";
      const ethereumProvider = {
        async send() {
          return (31337).toString(16);
        },
      } as unknown as EthereumProvider;

      await expect(
        Etherscan.getCurrentChainConfig(
          networkName,
          ethereumProvider,
          customChains
        )
      ).to.be.rejectedWith(
        /The selected network is "hardhat", which is not supported for contract verification./
      );
    });

    it("should return hardhat if the selected network is hardhat and it was added as a custom chain", async () => {
      const networkName = "hardhat";
      const ethereumProvider = {
        async send() {
          return (31337).toString(16);
        },
      } as unknown as EthereumProvider;

      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        networkName,
        ethereumProvider,
        [
          ...customChains,
          {
            network: "hardhat",
            chainId: 31337,
            urls: {
              apiURL: "<api-url>",
              browserURL: "<browser-url>",
            },
          },
        ]
      );

      assert.equal(currentChainConfig.network, networkName);
      assert.equal(currentChainConfig.chainId, 31337);
    });

    it("should throw if there are no matches at all", async () => {
      const networkName = "someNetwork";
      const ethereumProvider = {
        async send() {
          return (21343214123).toString(16);
        },
      } as unknown as EthereumProvider;

      await expect(
        Etherscan.getCurrentChainConfig(
          networkName,
          ethereumProvider,
          customChains
        )
      ).to.be.rejectedWith(
        /Trying to verify a contract in a network with chain id 21343214123, but the plugin doesn't recognize it as a supported chain./
      );
    });
  });

  describe("getContractUrl", () => {
    it("should return the contract url", () => {
      const expectedContractAddress =
        "https://goerli.etherscan.io/address/someAddress#code";
      let etherscan = Etherscan.fromChainConfig("someApiKey", chainConfig);
      let contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);

      etherscan = Etherscan.fromChainConfig("someApiKey", {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "   https://goerli.etherscan.io/  ",
        },
      });
      contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);
    });
  });

  describe("isVerified", function () {
    it("calls the api with a chainid parameter if present", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        5
      );

      try {
        await etherscan.isVerified("0x123abc");
      } catch (error) {}

      expect(sendGetRequestStub).to.be.calledOnceWithExactly(
        sinon.match.has(
          "search",
          sinon.match(sinon.match((value) => /chainid=5/.test(value)))
        )
      );
    });

    it("doesnt pass chainid if its not present in the instance", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        undefined
      );

      try {
        await etherscan.isVerified("0x123abc");
      } catch (error) {}

      expect(sendGetRequestStub).to.be.calledOnceWithExactly(
        sinon.match.has(
          "search",
          sinon.match((value) => !/chainid/.test(value))
        )
      );
    });
  });

  describe("verify", function () {
    it("calls the api with a chainid parameter if present", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        5
      );

      try {
        await etherscan.verify(
          "0x123abc",
          "sourceCode",
          "contractName",
          "v0.8.19",
          "constructorArgs"
        );
      } catch (error) {}

      expect(sendPostRequestStub).to.be.calledOnceWith(
        sinon.match.has(
          "search",
          sinon.match(sinon.match((value) => /chainid=5/.test(value)))
        )
      );
    });

    it("doesnt pass chainid if its not present in the instance", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        undefined
      );

      try {
        await etherscan.verify(
          "0x123abc",
          "sourceCode",
          "contractName",
          "v0.8.19",
          "constructorArgs"
        );
      } catch (error) {}

      expect(sendPostRequestStub).to.be.calledOnceWith(
        sinon.match.has(
          "search",
          sinon.match((value) => !/chainid/.test(value))
        )
      );
    });
  });

  describe("getVerificationStatus", function () {
    it("calls the api with a chainid parameter if present", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        5
      );

      try {
        await etherscan.getVerificationStatus("0x123abc");
      } catch (error) {}

      expect(sendGetRequestStub).to.be.calledOnceWithExactly(
        sinon.match.has(
          "search",
          sinon.match(sinon.match((value) => /chainid=5/.test(value)))
        )
      );
    });

    it("doesnt pass chainid if its not present in the instance", async () => {
      const etherscan = new Etherscan(
        "api_key",
        "https://api.etherscan.io/api",
        "https://etherscan.io",
        undefined
      );

      try {
        await etherscan.getVerificationStatus("0x123abc");
      } catch (error) {}

      expect(sendGetRequestStub).to.be.calledOnceWithExactly(
        sinon.match.has(
          "search",
          sinon.match((value) => !/chainid/.test(value))
        )
      );
    });
  });
});
