import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { getDispatcher } from "@nomicfoundation/hardhat-utils/request";

import {
  Sourcify,
  SOURCIFY_API_URL,
  SOURCIFY_REPO_URL,
} from "../src/internal/sourcify.js";

import { initializeTestDispatcher } from "./utils.js";

describe("sourcify", () => {
  describe("Sourcify class", async () => {
    const sourcifyConfig = {
      chainId: 11_155_111,
      name: "Sourcify",
      url: "http://repo.localhost",
      apiUrl: "http://localhost/server",
    };
    const sourcifyApiUrl = new URL(sourcifyConfig.apiUrl).origin;
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
    const verificationId = "6ab5e94b-2959-4945-bc92-c44a3fbcdb4a";

    describe("constructor", () => {
      it("should create an instance with the correct properties", () => {
        const sourcify = new Sourcify(sourcifyConfig);

        assert.equal(sourcify.name, sourcifyConfig.name);
        assert.equal(sourcify.url, sourcifyConfig.url);
        assert.equal(sourcify.apiUrl, sourcifyConfig.apiUrl);
        assert.equal(sourcify.chainId, String(sourcifyConfig.chainId));
      });

      it('should default to "Sourcify" if no name is provided', () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          name: undefined,
        });

        assert.equal(sourcify.name, "Sourcify");
      });

      it("should use default Sourcify URLs if not provided", () => {
        const sourcify = new Sourcify({
          chainId: sourcifyConfig.chainId,
        });

        assert.equal(sourcify.url, SOURCIFY_REPO_URL);
        assert.equal(sourcify.apiUrl, SOURCIFY_API_URL);
      });

      it("should configure proxy when no dispatcher provided and proxy environment variables are set", () => {
        process.env.https_proxy = "http://test-proxy:8080";

        const sourcify = new Sourcify({
          ...sourcifyConfig,
          apiUrl: SOURCIFY_API_URL,
        });

        assert.deepEqual(sourcify.dispatcherOrDispatcherOptions, {
          proxy: "http://test-proxy:8080",
        });

        delete process.env.https_proxy;
      });

      it("should not configure proxy when shouldUseProxy returns false", () => {
        process.env.https_proxy = "http://test-proxy:8080";
        process.env.NO_PROXY = "*";

        const sourcify = new Sourcify(sourcifyConfig);

        assert.deepEqual(sourcify.dispatcherOrDispatcherOptions, {});

        delete process.env.https_proxy;
        delete process.env.NO_PROXY;
      });

      it("should use provided dispatcher instead of auto-configuring proxy", async () => {
        process.env.https_proxy = "http://test-proxy:8080";
        const dispatcher = await getDispatcher(sourcifyApiUrl);

        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher,
        });

        assert.deepEqual(sourcify.dispatcherOrDispatcherOptions, dispatcher);

        delete process.env.https_proxy;
      });

      it("should configure no proxy when no environment variables are set", () => {
        const sourcify = new Sourcify(sourcifyConfig);

        assert.deepEqual(sourcify.dispatcherOrDispatcherOptions, {});
      });
    });

    describe("getContractUrl", () => {
      it("should return the contract url", () => {
        const sourcify = new Sourcify(sourcifyConfig);
        assert.equal(
          sourcify.getContractUrl(address),
          `${sourcifyConfig.url}/${sourcifyConfig.chainId}/${address}`,
        );
      });
    });

    describe("isVerified", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: sourcifyApiUrl,
      });

      let isVerifiedInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        isVerifiedInterceptor = testDispatcher.interceptable.intercept({
          path: `/server/v2/contract/${sourcifyConfig.chainId}/${address}`,
          method: "GET",
        });
      });

      it("should return true if the contract is verified (exact match)", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          match: "exact_match",
          creationMatch: null,
          runtimeMatch: "exact_match",
          chainId: String(sourcifyConfig.chainId),
          address,
        });

        const isVerified = await sourcify.isVerified(address);

        assert.equal(isVerified, true);
      });

      it("should return true if the contract is verified (partial match)", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          match: "match",
          creationMatch: null,
          runtimeMatch: "match",
          chainId: String(sourcifyConfig.chainId),
          address,
        });

        const isVerified = await sourcify.isVerified(address);

        assert.equal(isVerified, true);
      });

      it("should return false if the contract is not verified", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(404, {
          match: null,
          creationMatch: null,
          runtimeMatch: null,
          chainId: String(sourcifyConfig.chainId),
          address,
        });

        const isVerified = await sourcify.isVerified(address);

        assert.equal(isVerified, false);
      });

      it("should throw an error if the request fails", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        isVerifiedInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          sourcify.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate an error response
        isVerifiedInterceptor.reply(400, {
          customCode: "unsupported_chain",
          message: "Chain not found",
          errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
        });

        await assertRejectsWithHardhatError(
          sourcify.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            statusCode: 400,
            errorMessage: "Chain not found",
          },
        );

        // Simulate an invalid JSON response
        isVerifiedInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          sourcify.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the response is malformed", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        isVerifiedInterceptor.reply(200, {
          result: 0,
        });

        await assertRejectsWithHardhatError(
          sourcify.isVerified(address),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          {
            message: '{"result":0}',
          },
        );
      });
    });

    describe("verify", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: sourcifyApiUrl,
      });

      let verifyInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        verifyInterceptor = testDispatcher.interceptable.intercept({
          path: `/server/v2/verify/${sourcifyConfig.chainId}/${address}`,
          method: "POST",
          body: JSON.stringify({
            stdJsonInput: compilerInput,
            contractIdentifier: contract,
            compilerVersion,
          }),
        });
      });

      it("should return a verificationId if the verification request was submitted successfully", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(202, {
          verificationId,
        });

        let result: string;
        try {
          result = await sourcify.verify(
            address,
            compilerInput,
            contract,
            compilerVersion,
          );
        } catch {
          assert.fail("Expected verify to not throw an error");
        }

        assert.equal(result, verificationId);
      });

      it("should throw an error if the request fails", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        verifyInterceptor.replyWithError(new Error("Network error"));

        await assertRejectsWithHardhatError(
          sourcify.verify(address, compilerInput, contract, compilerVersion),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate an invalid JSON response
        verifyInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          sourcify.verify(address, compilerInput, contract, compilerVersion),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(409, {
          customCode: "already_verified",
          message: "Contract is already verified",
          errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
        });

        await assertRejectsWithHardhatError(
          sourcify.verify(address, compilerInput, contract, compilerVersion),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );
      });

      it("should throw an error on submission failure", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(404, {
          customCode: "unsupported_chain",
          message: "Chain not found",
          errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
        });

        await assertRejectsWithHardhatError(
          sourcify.verify(address, compilerInput, contract, compilerVersion),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_REQUEST_FAILED,
          {
            message: "Chain not found",
          },
        );
      });

      it("should throw an error if the response is malformed", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        verifyInterceptor.reply(200, {
          result: 0,
        });

        await assertRejectsWithHardhatError(
          sourcify.verify(address, compilerInput, contract, compilerVersion),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          {
            message: '{"result":0}',
          },
        );
      });
    });

    describe("pollVerificationStatus", async () => {
      const testDispatcher = initializeTestDispatcher({
        url: sourcifyApiUrl,
      });

      let pollVerificationStatusInterceptor: ReturnType<
        typeof testDispatcher.interceptable.intercept
      >;
      beforeEach(() => {
        pollVerificationStatusInterceptor =
          testDispatcher.interceptable.intercept({
            path: `/server/v2/verify/${verificationId}`,
            method: "GET",
          });
      });

      it("should return the verification status", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          verificationId,
          isJobCompleted: true,
          jobStartTime: new Date().toISOString(),
          jobFinishTime: new Date().toISOString(),
          contract: {
            match: "exact_match",
            runtimeMatch: "exact_match",
            creationMatch: "exact_match",
            chainId: String(sourcifyConfig.chainId),
            address,
          },
        });

        let result = await sourcify.pollVerificationStatus(
          verificationId,
          address,
          contract,
        );

        assert.equal(result.success, true);
        assert.equal(
          result.message,
          'Contract verified with status "exact_match"',
        );

        pollVerificationStatusInterceptor.reply(200, {
          verificationId,
          isJobCompleted: true,
          jobStartTime: new Date().toISOString(),
          jobFinishTime: new Date().toISOString(),
          contract: {
            match: null,
            runtimeMatch: null,
            creationMatch: null,
            chainId: String(sourcifyConfig.chainId),
            address,
          },
          error: {
            customCode: "compiler_error",
            message: "Compiler error.",
            errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
          },
        });

        result = await sourcify.pollVerificationStatus(
          verificationId,
          address,
          contract,
        );

        assert.equal(result.success, false);
        assert.equal(
          result.message,
          `Compiler error.
         More info at: ${sourcifyConfig.apiUrl}/verify-ui/jobs/${verificationId}`,
        );
      });

      it("should poll the verification status until it is successful or fails", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        let callCount = 0;
        pollVerificationStatusInterceptor
          .reply(200, () => {
            callCount++;
            return {
              verificationId,
              isJobCompleted: false,
              jobStartTime: new Date().toISOString(),
              contract: {
                match: null,
                runtimeMatch: null,
                creationMatch: null,
                chainId: String(sourcifyConfig.chainId),
                address,
              },
            };
          })
          .times(2);
        pollVerificationStatusInterceptor.reply(200, () => {
          callCount++;
          return {
            verificationId,
            isJobCompleted: true,
            jobStartTime: new Date().toISOString(),
            jobFinishTime: new Date().toISOString(),
            contract: {
              match: "match",
              runtimeMatch: "match",
              creationMatch: "match",
              chainId: String(sourcifyConfig.chainId),
              address,
            },
          };
        });

        const result = await sourcify.pollVerificationStatus(
          verificationId,
          address,
          contract,
        );

        assert.equal(result.success, true);
        assert.equal(result.message, 'Contract verified with status "match"');
        assert.equal(callCount, 3);
      });

      it("should throw an error if the request fails", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Simulate a network error
        pollVerificationStatusInterceptor.replyWithError(
          new Error("Network error"),
        );

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: "Network error",
          },
        );

        // Simulate an error response
        pollVerificationStatusInterceptor.reply(404, {
          customCode: "job_not_found",
          message: "No verification job found for id",
          errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
        });

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
          {
            message: "No verification job found for id",
          },
        );

        // Simulate an invalid JSON response
        pollVerificationStatusInterceptor.reply(200, "Invalid json response");

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
          {
            name: sourcifyConfig.name,
            url: sourcifyConfig.apiUrl,
            errorMessage: `Unexpected token 'I', "Invalid js"... is not valid JSON`,
          },
        );
      });

      it("should throw an error if the contract is already verified", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          verificationId,
          isJobCompleted: true,
          jobStartTime: new Date().toISOString(),
          jobFinishTime: new Date().toISOString(),
          contract: {
            match: null,
            runtimeMatch: null,
            creationMatch: null,
            chainId: String(sourcifyConfig.chainId),
            address,
          },
          error: {
            customCode: "already_verified",
            message: "Contract is already verified",
            errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
          },
        });

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
          {
            contract,
            address,
          },
        );
      });

      it("should throw an error if bytecode is missing", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        pollVerificationStatusInterceptor.reply(200, {
          verificationId,
          isJobCompleted: true,
          jobStartTime: new Date().toISOString(),
          jobFinishTime: new Date().toISOString(),
          contract: {
            match: null,
            runtimeMatch: null,
            creationMatch: null,
            chainId: String(sourcifyConfig.chainId),
            address,
          },
          error: {
            customCode: "contract_not_deployed",
            message: "Contract bytecode not found on chain",
            errorId: "72b347a4-3d74-4056-8552-a79f199e27f5",
          },
        });

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_MISSING_BYTECODE,
          {
            url: sourcifyConfig.apiUrl,
            address,
          },
        );
      });

      it("should throw an error if the response is malformed", async () => {
        const sourcify = new Sourcify({
          ...sourcifyConfig,
          dispatcher: testDispatcher.interceptable,
        });

        // Unexpected response shape
        pollVerificationStatusInterceptor.reply(200, {
          result: 0,
        });

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          {
            message: '{"result":0}',
          },
        );

        // No error, but contract still unverified
        pollVerificationStatusInterceptor.reply(200, {
          verificationId,
          isJobCompleted: true,
          jobStartTime: new Date().toISOString(),
          jobFinishTime: new Date().toISOString(),
          contract: {
            match: null,
            runtimeMatch: null,
            creationMatch: null,
            chainId: String(sourcifyConfig.chainId),
            address,
          },
        });

        await assertRejectsWithHardhatError(
          sourcify.pollVerificationStatus(verificationId, address, contract),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
          {
            message: 'Contract verified with status "null"',
          },
        );
      });
    });
  });
});
