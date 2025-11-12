import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
} from "hardhat/types/config";

import assert from "node:assert/strict";
import querystring from "node:querystring";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import { getDispatcher } from "@nomicfoundation/hardhat-utils/request";

import { Etherscan, ETHERSCAN_API_URL } from "../src/internal/etherscan.js";

import {
  initializeTestDispatcher,
  MockResolvedConfigurationVariable,
} from "./utils.js";

describe("etherscan", () => {
  describe("Etherscan class", async () => {
    const etherscanConfig = {
      chainId: 11_155_111,
      name: "SepoliaScan",
      url: "http://localhost",
      apiUrl: "http://localhost/v2/api",
      apiKey: "someApiKey",
    };
    const etherscanApiUrl = new URL(etherscanConfig.apiUrl).origin;
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const contract = "contracts/Test.sol:Test";
    const sourceCode =
      "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\n\ncontract Test {}";
    const compilerInput = {
      language: "Solidity",
      sources: {
        "contracts/Test.sol": {
          content: sourceCode,
        },
      },
      settings: {
        optimizer: { enabled: false },
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };
    const compilerVersion = "0.8.24+commit.e11b9ed9";
    const constructorArguments = "";
    const guid = "a7lpxkm9kpcpicx7daftmjifrfhiuhf5vqqnawhkfhzfrcpnxj";

    describe("constructor", () => {
      it("should create an instance with the correct properties", () => {
        const etherscan = new Etherscan(etherscanConfig);

        assert.equal(etherscan.chainId, "11155111");
        assert.equal(etherscan.name, etherscanConfig.name);
        assert.equal(etherscan.url, etherscanConfig.url);
        assert.equal(etherscan.apiUrl, etherscanConfig.apiUrl);
        assert.equal(etherscan.apiKey, etherscanConfig.apiKey);
      });

      it('should default to "Etherscan" if no name is provided', () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          name: undefined,
        });

        assert.equal(etherscan.name, "Etherscan");
      });

      it("should default to etherscan api if no apiUrl is provided", () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          apiUrl: undefined,
        });

        assert.equal(etherscan.apiUrl, ETHERSCAN_API_URL);
      });

      it("should throw an error if the apiKey is empty", () => {
        assertThrowsHardhatError(
          () =>
            new Etherscan({
              ...etherscanConfig,
              apiKey: "",
            }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_API_KEY_EMPTY,
          {
            verificationProvider: etherscanConfig.name,
          },
        );
      });

      it("should configure proxy when no dispatcher provided and proxy environment variables are set", () => {
        process.env.https_proxy = "http://test-proxy:8080";

        const etherscan = new Etherscan({
          ...etherscanConfig,
          apiUrl: ETHERSCAN_API_URL,
        });

        assert.deepEqual(etherscan.dispatcherOrDispatcherOptions, {
          proxy: "http://test-proxy:8080",
        });

        delete process.env.https_proxy;
      });

      it("should not configure proxy when shouldUseProxy returns false", () => {
        process.env.https_proxy = "http://test-proxy:8080";
        process.env.NO_PROXY = "*";

        const etherscan = new Etherscan(etherscanConfig);

        assert.deepEqual(etherscan.dispatcherOrDispatcherOptions, {});

        delete process.env.https_proxy;
        delete process.env.NO_PROXY;
      });

      it("should use provided dispatcher instead of auto-configuring proxy", async () => {
        process.env.https_proxy = "http://test-proxy:8080";
        const dispatcher = await getDispatcher(etherscanApiUrl);

        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher,
        });

        assert.deepEqual(etherscan.dispatcherOrDispatcherOptions, dispatcher);

        delete process.env.https_proxy;
      });

      it("should configure no proxy when no environment variables are set", () => {
        const etherscan = new Etherscan(etherscanConfig);

        assert.deepEqual(etherscan.dispatcherOrDispatcherOptions, {});
      });
    });

    describe("getContractUrl", () => {
      it("should return the contract url", () => {
        const etherscan = new Etherscan(etherscanConfig);
        assert.equal(
          etherscan.getContractUrl(address),
          `${etherscanConfig.url}/address/${address}#code`,
        );
      });
    });

    describe("isVerified", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: etherscanApiUrl,
      });

      let isVerifiedInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        isVerifiedInterceptor = testDispatcher.interceptable.intercept({
          path: "/v2/api",
          method: "GET",
          query: {
            module: "contract",
            action: "getsourcecode",
            chainid: String(etherscanConfig.chainId),
            apikey: etherscanConfig.apiKey,
            address,
          },
        });
      });

      it("should return true if the contract is verified", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          status: "1",
          result: [
            {
              SourceCode: sourceCode,
            },
          ],
        });

        let response: boolean | undefined;
        try {
          response = await etherscan.isVerified(address);
        } catch {
          assert.fail("Expected isVerified to not throw an error");
        }

        assert.equal(response, true);
      });

      it("should return false if the contract is not verified", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          status: "0",
        });

        let response: boolean | undefined;
        try {
          response = await etherscan.isVerified(address);
        } catch {
          assert.fail("Expected isVerified to not throw an error");
        }

        assert.equal(response, false);

        isVerifiedInterceptor.reply(200, {
          status: "1",
          result: [
            {
              SourceCode: "",
            },
          ],
        });

        try {
          response = await etherscan.isVerified(address);
        } catch {
          assert.fail("Expected isVerified to not throw an error");
        }

        assert.equal(response, false);
      });

      it("should throw an error if the request fails", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        isVerifiedInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          etherscan.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        isVerifiedInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          etherscan.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        isVerifiedInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          etherscan.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(300, { result: "Redirection error" });

        await assertRejectsWithHardhatError(
          etherscan.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });
    });

    describe("verify", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: etherscanApiUrl,
      });

      let verifyInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        verifyInterceptor = testDispatcher.interceptable.intercept({
          path: "/v2/api",
          method: "POST",
          query: {
            module: "contract",
            action: "verifysourcecode",
            chainid: String(etherscanConfig.chainId),
            apikey: etherscanConfig.apiKey,
          },
          body: querystring.stringify({
            contractaddress: address,
            sourceCode: JSON.stringify(compilerInput),
            codeformat: "solidity-standard-json-input",
            contractname: contract,
            compilerversion: compilerVersion,
            constructorArguments,
          }),
        });
      });

      it("should return a guid if the verification request was submitted successfully", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          status: "1",
          message: "OK",
          result: guid,
        });

        let response: string | undefined;
        try {
          response = await etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          });
        } catch {
          assert.fail("Expected verify to not throw an error");
        }

        assert.equal(response, guid);
      });

      it("should throw an error if the request fails", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        verifyInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        verifyInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        verifyInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(300, { result: "Redirection error" });

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });

      it("should throw an error if Etherscan is unable to locate the contract", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: `Unable to locate ContractCode at ${address}`,
        });

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_MISSING_BYTECODE,
          {
            url: etherscanConfig.apiUrl,
            address,
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: "Contract source code already verified",
        });

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );

        verifyInterceptor.reply(200, {
          result: "Already Verified",
        });

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );
      });

      it("should throw an error if the etherscan response status is not 1", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          status: "0",
          result: "Some error message",
        });

        await assertRejectsWithHardhatError(
          etherscan.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_REQUEST_FAILED,
          { message: "Some error message" },
        );
      });
    });

    describe("pollVerificationStatus", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: etherscanApiUrl,
      });

      let pollVerificationStatusInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        pollVerificationStatusInterceptor =
          testDispatcher.interceptable.intercept({
            path: "/v2/api",
            method: "GET",
            query: {
              module: "contract",
              action: "checkverifystatus",
              chainid: String(etherscanConfig.chainId),
              apikey: etherscanConfig.apiKey,
              guid,
            },
          });
      });

      it("should return the verification status", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "1",
          result: "Pass - Verified",
        });

        let response: { success: boolean; message: string } | undefined;
        try {
          response = await etherscan.pollVerificationStatus(
            guid,
            address,
            contract,
          );
        } catch {
          assert.fail("Expected pollVerificationStatus to not throw an error");
        }

        assert.equal(response.success, true);
        assert.equal(response.message, "Pass - Verified");

        pollVerificationStatusInterceptor.reply(200, {
          status: "1",
          result: "Fail - Unable to verify",
        });

        try {
          response = await etherscan.pollVerificationStatus(
            guid,
            address,
            contract,
          );
        } catch {
          assert.fail("Expected pollVerificationStatus to not throw an error");
        }

        assert.equal(response.success, false);
        assert.equal(response.message, "Fail - Unable to verify");
      });

      it("should poll the verification status until it is successful or fails", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        let callCount = 0;
        pollVerificationStatusInterceptor
          .reply(200, () => {
            callCount++;
            return {
              status: "1",
              result: "Pending in queue",
            };
          })
          .times(2);
        pollVerificationStatusInterceptor.reply(200, () => {
          callCount++;
          return {
            status: "1",
            result: "Pass - Verified",
          };
        });

        let response: { success: boolean; message: string } | undefined;
        try {
          response = await etherscan.pollVerificationStatus(
            guid,
            address,
            contract,
          );
        } catch {
          assert.fail("Expected pollVerificationStatus to not throw an error");
        }

        assert.equal(response.success, true);
        assert.equal(response.message, "Pass - Verified");
        assert.equal(callCount, 3);
      });

      it("should throw an error if the request fails", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        pollVerificationStatusInterceptor.replyWithError(
          new Error("Network error"),
        );

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        pollVerificationStatusInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        pollVerificationStatusInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(300, {
          result: "Redirection error",
        });

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: etherscanConfig.name,
            url: etherscanConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          result: "Contract source code already verified",
        });

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );

        pollVerificationStatusInterceptor.reply(200, {
          result: "Already Verified",
        });

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );
      });

      it("should throw an error if the etherscan response status is not 1", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "0",
          result: "Some error message",
        });

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
          { message: "Some error message" },
        );
      });

      it("should throw an error if the etherscan response result is not 'Pass - Verified' or 'Fail - Unable to verify'", async () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "1",
          result: "Some unexpected result",
        });

        await assertRejectsWithHardhatError(
          etherscan.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          { message: "Some unexpected result" },
        );
      });
    });
  });

  describe("resolveConfig", () => {
    const testDispatcher = initializeTestDispatcher({
      url: "https://api.etherscan.io",
    });
    const verificationProvidersConfig = {
      etherscan: {
        enabled: true,
        apiKey: new MockResolvedConfigurationVariable("test-key"),
      },
      blockscout: { enabled: true },
      sourcify: { enabled: true },
    };

    it("should return explorer config from chain descriptors when chain is configured", async () => {
      const testChainDescriptor: ChainDescriptorConfig = {
        name: "Sepolia",
        chainType: "l1",
        blockExplorers: {
          etherscan: {
            url: "https://sepolia.etherscan.io",
          },
        },
      };

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [11155111n, testChainDescriptor],
      ]);

      const result = await Etherscan.resolveConfig({
        chainId: 11155111,
        networkName: "sepolia",
        chainDescriptors,
        verificationProvidersConfig,
      });

      assert.deepEqual(
        result.blockExplorerConfig,
        testChainDescriptor.blockExplorers.etherscan,
      );
    });

    it("should fetch from API when chain not in descriptors", async () => {
      const chainDescriptors: ChainDescriptorsConfig = new Map();

      testDispatcher.interceptable
        .intercept({
          path: "/v2/chainlist",
          method: "GET",
        })
        .reply(200, {
          comments: "Version 1.0",
          totalcount: "1",
          result: [
            {
              chainname: "Mainnet",
              chainid: "1",
              blockexplorer: "https://etherscan.io",
              apiurl: "https://api.etherscan.io",
              status: 1,
              comment: "Mainnet",
            },
          ],
        });

      const result = await Etherscan.resolveConfig({
        chainId: 1,
        networkName: "mainnet",
        chainDescriptors,
        verificationProvidersConfig,
        dispatcher: testDispatcher.interceptable,
        shouldUseCache: false,
      });

      assert.deepEqual(result.blockExplorerConfig, {
        url: "https://etherscan.io",
      });
    });

    it("should throw NETWORK_NOT_SUPPORTED when chain not found anywhere", async () => {
      const chainDescriptors: ChainDescriptorsConfig = new Map();

      testDispatcher.interceptable
        .intercept({
          path: "/v2/chainlist",
          method: "GET",
        })
        .reply(200, {
          comments: "Version 1.0",
          totalcount: "0",
          result: [],
        });

      await assertRejectsWithHardhatError(
        Etherscan.resolveConfig({
          chainId: 999,
          networkName: "unknown",
          chainDescriptors,
          verificationProvidersConfig,
          dispatcher: testDispatcher.interceptable,
          shouldUseCache: false,
        }),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
        {
          networkName: "unknown",
          chainId: 999,
        },
      );
    });

    it("should throw BLOCK_EXPLORER_NOT_CONFIGURED when chain exists but explorer not found", async () => {
      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [
          100n,
          {
            name: "TestNet",
            chainType: "l1",
            blockExplorers: {},
          },
        ],
      ]);

      testDispatcher.interceptable
        .intercept({
          path: "/v2/chainlist",
          method: "GET",
        })
        .reply(200, {
          comments: "Version 1.0",
          totalcount: "0",
          result: [],
        });

      await assertRejectsWithHardhatError(
        Etherscan.resolveConfig({
          chainId: 100,
          networkName: "testnet",
          chainDescriptors,
          verificationProvidersConfig,
          dispatcher: testDispatcher.interceptable,
          shouldUseCache: false,
        }),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .BLOCK_EXPLORER_NOT_CONFIGURED,
        {
          verificationProvider: "Etherscan",
          chainId: 100,
        },
      );
    });
  });

  describe("getSupportedChains", () => {
    const testDispatcher = initializeTestDispatcher({
      url: "https://api.etherscan.io",
    });
    let getSupportedChainsInterceptor: ReturnType<
      typeof testDispatcher.interceptable.intercept
    >;
    beforeEach(() => {
      getSupportedChainsInterceptor = testDispatcher.interceptable.intercept({
        path: "/v2/chainlist",
        method: "GET",
      });
    });

    it("should cache result and reuse on second call", async () => {
      getSupportedChainsInterceptor.reply(200, {
        comments: "Version 1.0",
        totalcount: "1",
        result: [
          {
            chainname: "Mainnet",
            chainid: "1",
            blockexplorer: "https://etherscan.io",
            apiurl: "https://api.etherscan.io",
            status: 1,
            comment: "Mainnet",
          },
        ],
      });

      const result1 = await Etherscan.getSupportedChains(
        testDispatcher.interceptable,
      );
      // Second call will throw MockNotMatchedError if it tries to make another request
      const result2 = await Etherscan.getSupportedChains(
        testDispatcher.interceptable,
      );

      assert.equal(result1, result2, "Should return same cached instance");
    });

    it("should parse chain data correctly", async () => {
      getSupportedChainsInterceptor.reply(200, {
        comments: "Version 1.0",
        totalcount: "3",
        result: [
          {
            chainname: "Ethereum Mainnet",
            chainid: "1",
            blockexplorer: "https://etherscan.io",
            apiurl: "https://api.etherscan.io",
            status: 1,
            comment: "Mainnet",
          },
          {
            chainname: "Polygon",
            chainid: "137",
            blockexplorer: "https://polygonscan.com",
            apiurl: "https://api.polygonscan.com",
            status: 1,
            comment: "Sidechain",
          },
          {
            chainname: "Sepolia",
            chainid: "11155111",
            blockexplorer: "https://sepolia.etherscan.io",
            apiurl: "https://api-sepolia.etherscan.io",
            status: 1,
            comment: "Testnet",
          },
        ],
      });

      const chains = await Etherscan.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      assert.equal(chains.size, 3);
      assert.ok(chains.has(1n), "Should have Mainnet");
      assert.ok(chains.has(137n), "Should have Polygon");
      assert.ok(chains.has(11155111n), "Should have Sepolia");
      assert.equal(chains.get(1n)?.name, "Ethereum Mainnet");
      assert.equal(chains.get(137n)?.name, "Polygon");
      assert.equal(chains.get(11155111n)?.name, "Sepolia");
    });

    it("should return empty map on API error without throwing", async () => {
      testDispatcher.interceptable
        .intercept({
          path: "/v2/chainlist",
          method: "GET",
        })
        .reply(500, "Internal Server Error");

      const chains = await Etherscan.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      assert.ok(chains instanceof Map, "Should be a Map instance");
      assert.equal(chains.size, 0);
    });
  });
});
