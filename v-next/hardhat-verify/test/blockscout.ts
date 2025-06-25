import assert from "node:assert/strict";
import querystring from "node:querystring";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { Blockscout } from "../src/internal/blockscout.js";

import { initializeTestDispatcher } from "./utils.js";

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
            sourceCode,
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
          response = await blockscout.verify(
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
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        verifyInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
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

      it("should throw an error if the address does not contain a contract", async () => {
        const blockscout = new Blockscout({
          ...blockscoutConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: "The address is not a smart contract",
        });

        await assertRejectsWithHardhatError(
          blockscout.verify(
            address,
            sourceCode,
            contract,
            compilerVersion,
            constructorArguments,
          ),
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
          blockscout.verify(
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
});
