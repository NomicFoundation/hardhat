import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
} from "hardhat/types/config";

import assert from "node:assert/strict";
import querystring from "node:querystring";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { getDispatcher } from "@nomicfoundation/hardhat-utils/request";

import { Blockscout } from "../src/internal/blockscout.js";

import {
  initializeTestDispatcher,
  MockResolvedConfigurationVariable,
} from "./utils.js";

describe("blockscout", () => {
  describe("Blockscout class", async () => {
    const blockscoutConfig = {
      name: "SepoliaScout",
      url: "http://localhost",
      apiUrl: "https://api.localhost/api",
    };
    const blockscoutApiUrl = new URL(blockscoutConfig.apiUrl).origin;
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
        const blockscout = new Blockscout(blockscoutConfig);

        assert.equal(blockscout.name, blockscoutConfig.name);
        assert.equal(blockscout.url, blockscoutConfig.url);
        assert.equal(blockscout.apiUrl, blockscoutConfig.apiUrl);
      });

      it('should default to "Blockscout" if no name is provided', () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          name: undefined,
        });

        assert.equal(blockscout.name, "Blockscout");
      });

      it("should configure proxy when no dispatcher provided and proxy environment variables are set", () => {
        process.env.https_proxy = "http://test-proxy:8080";

        const blockscout = new Blockscout(blockscoutConfig);

        assert.deepEqual(blockscout.dispatcherOrDispatcherOptions, {
          proxy: "http://test-proxy:8080",
        });

        delete process.env.https_proxy;
      });

      it("should not configure proxy when shouldUseProxy returns false", () => {
        process.env.https_proxy = "http://test-proxy:8080";
        process.env.NO_PROXY = "*";

        const blockscout = new Blockscout(blockscoutConfig);

        assert.deepEqual(blockscout.dispatcherOrDispatcherOptions, {});

        delete process.env.https_proxy;
        delete process.env.NO_PROXY;
      });

      it("should use provided dispatcher instead of auto-configuring proxy", async () => {
        process.env.https_proxy = "http://test-proxy:8080";
        const dispatcher = await getDispatcher(blockscoutApiUrl);

        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher,
        });

        assert.deepEqual(blockscout.dispatcherOrDispatcherOptions, dispatcher);

        delete process.env.https_proxy;
      });

      it("should configure no proxy when no environment variables are set", () => {
        const blockscout = new Blockscout(blockscoutConfig);

        assert.deepEqual(blockscout.dispatcherOrDispatcherOptions, {});
      });
    });

    describe("getContractUrl", () => {
      it("should return the contract url", () => {
        const blockscout = new Blockscout(blockscoutConfig);
        assert.equal(
          blockscout.getContractUrl(address),
          `${blockscoutConfig.url}/address/${address}#code`,
        );
      });
    });

    describe("isVerified", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: blockscoutApiUrl,
      });

      let isVerifiedInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        isVerifiedInterceptor = testDispatcher.interceptable.intercept({
          path: "/api",
          method: "GET",
          query: {
            module: "contract",
            action: "getsourcecode",
            address,
          },
        });
      });

      it("should return true if the contract is verified", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
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
          response = await blockscout.isVerified(address);
        } catch {
          assert.fail("Expected isVerified to not throw an error");
        }

        assert.equal(response, true);
      });

      it("should return false if the contract is not verified", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          status: "0",
        });

        let response: boolean | undefined;
        try {
          response = await blockscout.isVerified(address);
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
          response = await blockscout.isVerified(address);
        } catch {
          assert.fail("Expected isVerified to not throw an error");
        }

        assert.equal(response, false);
      });

      it("should throw an error if the request fails", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        isVerifiedInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          blockscout.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        isVerifiedInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          blockscout.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        isVerifiedInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          blockscout.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(300, { result: "Redirection error" });

        await assertRejectsWithHardhatError(
          blockscout.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });
    });

    describe("verify", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: blockscoutApiUrl,
      });

      let verifyInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        verifyInterceptor = testDispatcher.interceptable.intercept({
          path: "/api",
          method: "POST",
          query: {
            module: "contract",
            action: "verifysourcecode",
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
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          status: "1",
          message: "OK",
          result: guid,
        });

        let response: string | undefined;
        try {
          response = await blockscout.verify({
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
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        verifyInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        verifyInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        verifyInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(300, { result: "Redirection error" });

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });

      it("should throw an error if Blockscout is unable to locate the contract", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: `Unable to locate ContractCode at ${address}`,
        });

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_MISSING_BYTECODE,
          {
            url: blockscoutConfig.apiUrl,
            address,
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: "Smart-contract already verified.",
        });

        await assertRejectsWithHardhatError(
          blockscout.verify({
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

      it("should throw an error if the address does not contain a contract", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: "The address is not a smart contract",
        });

        await assertRejectsWithHardhatError(
          blockscout.verify({
            contractAddress: address,
            compilerInput,
            contractName: contract,
            compilerVersion,
            constructorArguments,
          }),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.ADDRESS_NOT_A_CONTRACT,
          {
            verificationProvider: blockscoutConfig.name,
            address,
          },
        );
      });

      it("should throw an error if the blockscout response status is not 1", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          status: "0",
          result: "Some error message",
        });

        await assertRejectsWithHardhatError(
          blockscout.verify({
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
        url: blockscoutApiUrl,
      });

      let pollVerificationStatusInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        pollVerificationStatusInterceptor =
          testDispatcher.interceptable.intercept({
            path: "/api",
            method: "GET",
            query: {
              module: "contract",
              action: "checkverifystatus",
              guid,
            },
          });
      });

      it("should return the verification status", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "1",
          result: "Pass - Verified",
        });

        let response: { success: boolean; message: string } | undefined;
        try {
          response = await blockscout.pollVerificationStatus(
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
          response = await blockscout.pollVerificationStatus(
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
        const blockscout = new Blockscout({
          ...blockscoutConfig,
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
          response = await blockscout.pollVerificationStatus(
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
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        pollVerificationStatusInterceptor.replyWithError(
          new Error("Network error"),
        );

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        pollVerificationStatusInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        pollVerificationStatusInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response status code is 300-399", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(300, {
          result: "Redirection error",
        });

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: blockscoutConfig.name,
            url: blockscoutConfig.apiUrl,
            statusCode: 300,
            errorMessage: "Redirection error",
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          result: "Smart-contract already verified.",
        });

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );
      });

      it("should throw an error if the blockscout response status is not 1", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "0",
          result: "Some error message",
        });

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
          { message: "Some error message" },
        );
      });

      it("should throw an error if the blockscout response result is not 'Pass - Verified' or 'Fail - Unable to verify'", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          status: "1",
          result: "Some unexpected result",
        });

        await assertRejectsWithHardhatError(
          blockscout.pollVerificationStatus(guid, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          { message: "Some unexpected result" },
        );
      });
    });
  });

  describe("resolveConfig", () => {
    const testDispatcher = initializeTestDispatcher({
      url: "https://chains.blockscout.com",
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
        name: "TestNet",
        chainType: "l1",
        blockExplorers: {
          blockscout: {
            url: "https://blockscout.test.com",
            apiUrl: "https://api.blockscout.test.com/api",
          },
        },
      };

      const chainDescriptors: ChainDescriptorsConfig = new Map([
        [123n, testChainDescriptor],
      ]);

      const result = await Blockscout.resolveConfig({
        chainId: 123,
        networkName: "testnet",
        chainDescriptors,
        verificationProvidersConfig,
      });

      assert.deepEqual(
        result.blockExplorerConfig,
        testChainDescriptor.blockExplorers.blockscout,
      );
    });

    it("should fetch from API when chain not in descriptors", async () => {
      const chainDescriptors: ChainDescriptorsConfig = new Map();

      testDispatcher.interceptable
        .intercept({
          path: "/api/chains",
          method: "GET",
        })
        .reply(200, {
          "789": {
            name: "TestNet",
            description: "Test network",
            logo: "https://test.com/logo.png",
            ecosystem: "test",
            isTestnet: true,
            layer: 1,
            rollupType: null,
            native_currency: "TEST",
            website: "https://test.com",
            explorers: [
              {
                url: "https://blockscout.test.com",
                hostedBy: "blockscout",
              },
            ],
          },
        });

      const result = await Blockscout.resolveConfig({
        chainId: 789,
        networkName: "testnet",
        chainDescriptors,
        verificationProvidersConfig,
        dispatcher: testDispatcher.interceptable,
        shouldUseCache: false,
      });

      assert.deepEqual(result.blockExplorerConfig, {
        url: "https://blockscout.test.com",
        apiUrl: "https://blockscout.test.com/api",
      });
    });

    it("should throw NETWORK_NOT_SUPPORTED when chain not found anywhere", async () => {
      const chainDescriptors: ChainDescriptorsConfig = new Map();

      testDispatcher.interceptable
        .intercept({
          path: "/api/chains",
          method: "GET",
        })
        .reply(200, {});

      await assertRejectsWithHardhatError(
        Blockscout.resolveConfig({
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
          path: "/api/chains",
          method: "GET",
        })
        .reply(200, {
          "100": {
            name: "TestNet",
            description: "Test network",
            logo: "https://test.com/logo.png",
            ecosystem: "test",
            isTestnet: true,
            layer: 1,
            rollupType: null,
            native_currency: "TEST",
            website: "https://test.com",
            explorers: [
              {
                url: "https://other.test.com",
                hostedBy: "other",
              },
            ],
          },
        });

      await assertRejectsWithHardhatError(
        Blockscout.resolveConfig({
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
          verificationProvider: "Blockscout",
          chainId: 100,
        },
      );
    });
  });

  describe("getSupportedChains", () => {
    const testDispatcher = initializeTestDispatcher({
      url: "https://chains.blockscout.com",
    });
    let getSupportedChainsInterceptor: ReturnType<
      typeof testDispatcher.interceptable.intercept
    >;
    beforeEach(() => {
      getSupportedChainsInterceptor = testDispatcher.interceptable.intercept({
        path: "/api/chains",
        method: "GET",
      });
    });

    it("should cache result and reuse on second call", async () => {
      getSupportedChainsInterceptor.reply(200, {
        "301": {
          name: "TestNet",
          description: "Test network",
          logo: "https://test.com/logo.png",
          ecosystem: "test",
          isTestnet: true,
          layer: 1,
          rollupType: null,
          native_currency: "TEST",
          website: "https://test.com",
          explorers: [
            {
              url: "https://blockscout.test.com",
              hostedBy: "blockscout",
            },
          ],
        },
      });

      const result1 = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
      );
      // Second call will throw MockNotMatchedError if it tries to make another request
      const result2 = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
      );

      assert.equal(result1, result2, "Should return same cached instance");
    });

    it("should parse chain data correctly", async () => {
      getSupportedChainsInterceptor.reply(200, {
        "302": {
          name: "TestNet",
          description: "Test network",
          logo: "https://test.com/logo.png",
          ecosystem: ["defi", "nft"],
          isTestnet: true,
          layer: 2,
          rollupType: "optimistic",
          native_currency: "TEST",
          website: "https://test.com",
          explorers: [
            {
              url: "https://blockscout.test.com",
              hostedBy: "blockscout",
            },
          ],
        },
      });

      const chains = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      const chain = chains.get(302n);
      assert.ok(chain !== undefined, "Should include chain 302");
      assert.equal(chain.name, "TestNet");
      assert.equal(
        chain.blockExplorers.blockscout?.url,
        "https://blockscout.test.com",
      );
      assert.equal(
        chain.blockExplorers.blockscout?.apiUrl,
        "https://blockscout.test.com/api",
      );
    });

    it("should filter explorers by hostedBy field", async () => {
      getSupportedChainsInterceptor.reply(200, {
        "303": {
          name: "TestNet",
          description: "Test network",
          logo: "https://test.com/logo.png",
          ecosystem: "test",
          isTestnet: true,
          layer: 1,
          rollupType: null,
          native_currency: "TEST",
          website: "https://test.com",
          explorers: [
            {
              url: "https://other.test.com",
              hostedBy: "otherhost",
            },
            {
              url: "https://blockscout.test.com",
              hostedBy: "blockscout",
            },
            {
              url: "https://another.test.com",
              hostedBy: "anotherhost",
            },
          ],
        },
      });

      const chains = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      const chain = chains.get(303n);
      assert.equal(
        chain?.blockExplorers.blockscout?.url,
        "https://blockscout.test.com",
      );
      assert.equal(
        chain?.blockExplorers.blockscout?.apiUrl,
        "https://blockscout.test.com/api",
      );
    });

    it("should skip chains without blockscout explorer", async () => {
      getSupportedChainsInterceptor.reply(200, {
        "304": {
          name: "TestNet1",
          description: "Test network",
          logo: "https://test.com/logo.png",
          ecosystem: "test",
          isTestnet: true,
          layer: 1,
          rollupType: null,
          native_currency: "TEST",
          website: "https://test.com",
          explorers: [
            {
              url: "https://blockscout.test.com",
              hostedBy: "blockscout",
            },
          ],
        },
        "305": {
          name: "TestNet2",
          description: "Test network 2",
          logo: "https://test2.com/logo.png",
          ecosystem: "test",
          isTestnet: true,
          layer: 1,
          rollupType: null,
          native_currency: "TEST2",
          website: "https://test2.com",
          explorers: [
            {
              url: "https://other.test.com",
              hostedBy: "otherhost",
            },
          ],
        },
      });

      const chains = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      assert.ok(
        chains.has(304n),
        "Should include chain with blockscout explorer",
      );
      assert.ok(
        !chains.has(305n),
        "Should not include chain without blockscout explorer",
      );
    });

    it("should return empty map on API error without throwing", async () => {
      getSupportedChainsInterceptor.reply(500, "Internal Server Error");

      const chains = await Blockscout.getSupportedChains(
        testDispatcher.interceptable,
        false,
      );

      assert.ok(chains instanceof Map, "Should return a Map instance");
      assert.equal(chains.size, 0);
    });
  });
});
