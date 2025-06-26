import assert from "node:assert/strict";
import querystring from "node:querystring";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import { Etherscan, ETHERSCAN_API_URL } from "../src/internal/etherscan.js";

import { initializeTestDispatcher } from "./utils.js";

describe("etherscan", () => {
  describe("Etherscan class", async () => {
    const etherscanConfig = {
      chainId: 11_155_111,
      name: "SepoliaScan",
      url: "http://localhost",
      apiKey: "someApiKey",
    };
    const etherscanApiUrl = new URL(ETHERSCAN_API_URL).origin;
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const contract = "contracts/Test.sol:Test";
    const sourceCode =
      "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\n\ncontract Test {}";
    const compilerVersion = "0.8.24+commit.e11b9ed9";
    const constructorArguments = "";
    const guid = "a7lpxkm9kpcpicx7daftmjifrfhiuhf5vqqnawhkfhzfrcpnxj";

    describe("constructor", () => {
      it("should create an instance with the correct properties", () => {
        const etherscan = new Etherscan(etherscanConfig);

        assert.equal(etherscan.chainId, "11155111");
        assert.equal(etherscan.name, etherscanConfig.name);
        assert.equal(etherscan.url, etherscanConfig.url);
        assert.equal(etherscan.apiKey, etherscanConfig.apiKey);
      });

      it('should default to "Etherscan" if no name is provided', () => {
        const etherscan = new Etherscan({
          ...etherscanConfig,
          name: undefined,
        });

        assert.equal(etherscan.name, "Etherscan");
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
            sourceCode,
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
          response = await etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          );
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: ETHERSCAN_API_URL,
            errorMessage: "Network error",
          },
        );

        // Simulate a 400-599 status code error
        verifyInterceptor.reply(400, "Bad Request");

        await assertRejectsWithHardhatError(
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: ETHERSCAN_API_URL,
            // this message comes from ResponseStatusCodeError in hardhat-utils
            errorMessage: "Response status code 400: Bad Request",
          },
        );

        // Simulate a invalid JSON response
        verifyInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: etherscanConfig.name,
            url: ETHERSCAN_API_URL,
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: etherscanConfig.name,
            url: ETHERSCAN_API_URL,
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_MISSING_BYTECODE,
          {
            url: ETHERSCAN_API_URL,
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          etherscan.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
            url: ETHERSCAN_API_URL,
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
});
