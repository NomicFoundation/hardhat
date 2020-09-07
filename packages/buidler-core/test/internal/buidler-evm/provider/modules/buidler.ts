import { assert } from "chai";
import { bufferToHex } from "ethereumjs-util";

import { MethodNotSupportedError } from "../../../../../src/internal/buidler-evm/provider/errors";
import {
  assertBuidlerEVMProviderError,
  assertInvalidArgumentsError,
} from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS, INFURA_URL } from "../../helpers/constants";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Buidler module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe(
        "buidler_impersonate",
        isFork ? testBuidlerImpersonateFork : testBuidlerImpersonate
      );

      function testBuidlerImpersonateFork() {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "buidler_impersonate",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "buidler_impersonate",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true", async function () {
          const result = await this.provider.send("buidler_impersonate", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          assert.isTrue(result);
        });
      }

      function testBuidlerImpersonate() {
        it("is not supported", async function () {
          await assertBuidlerEVMProviderError(
            this.provider,
            "buidler_impersonate",
            [],
            `Method buidler_impersonate is only supported in forked provider`,
            MethodNotSupportedError.CODE
          );
        });
      }

      describe(
        "buidler_stopImpersonating",
        isFork ? testBuidlerStopImpersonatingFork : testBuidlerStopImpersonating
      );

      function testBuidlerStopImpersonatingFork() {
        it("validates input parameter", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "buidler_stopImpersonating",
            ["0x1234"]
          );

          await assertInvalidArgumentsError(
            this.provider,
            "buidler_stopImpersonating",
            ["1234567890abcdef1234567890abcdef12345678"]
          );
        });

        it("returns true if the account was impersonated before", async function () {
          await this.provider.send("buidler_impersonate", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          const result = await this.provider.send("buidler_stopImpersonating", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          assert.isTrue(result);
        });

        it("returns false if the account wasn't impersonated before", async function () {
          const result = await this.provider.send("buidler_stopImpersonating", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          assert.isFalse(result);
        });
      }

      function testBuidlerStopImpersonating() {
        it("is not supported", async function () {
          await assertBuidlerEVMProviderError(
            this.provider,
            "buidler_stopImpersonating",
            [],
            `Method buidler_stopImpersonating is only supported in forked provider`,
            MethodNotSupportedError.CODE
          );
        });
      }

      describe("buidler_reset", isFork ? buidlerResetFork : buidlerReset);

      function buidlerResetFork() {
        it("validates input parameters", async function () {
          await assertInvalidArgumentsError(this.provider, "buidler_reset", []);
          await assertInvalidArgumentsError(this.provider, "buidler_reset", [
            {
              jsonRpcUrl: 123,
            },
          ]);
          await assertInvalidArgumentsError(this.provider, "buidler_reset", [
            {
              blockNumber: 0,
            },
          ]);
          await assertInvalidArgumentsError(this.provider, "buidler_reset", [
            {
              jsonRpcUrl: INFURA_URL,
              blockNumber: "0",
            },
          ]);
        });

        it("returns true", async function () {
          const result = await this.provider.send("buidler_reset", [
            {
              jsonRpcUrl: INFURA_URL,
              blockNumber: 123,
            },
          ]);
          assert.isTrue(result);
        });
      }

      function buidlerReset() {
        it("is not supported", async function () {
          await assertBuidlerEVMProviderError(
            this.provider,
            "buidler_reset",
            [],
            `Method buidler_reset is only supported in forked provider`,
            MethodNotSupportedError.CODE
          );
        });
      }
    });
  });
});
