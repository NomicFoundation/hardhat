import { assert } from "chai";
import { bufferToHex } from "ethereumjs-util";

import { MethodNotSupportedError } from "../../../../../src/internal/buidler-evm/provider/errors";
import { INFURA_URL } from "../../../../setup";
import {
  assertBuidlerEVMProviderError,
  assertInvalidArgumentsError,
} from "../../helpers/assertions";
import { EMPTY_ACCOUNT_ADDRESS } from "../../helpers/constants";
import { quantityToNumber } from "../../helpers/conversions";
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

      describe("buidler_reset", function () {
        it("validates input parameters", async function () {
          await assertInvalidArgumentsError(this.provider, "buidler_reset", [
            {},
          ]);
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
            { jsonRpcUrl: INFURA_URL, blockNumber: 123 },
          ]);
          assert.isTrue(result);
        });

        if (isFork) {
          testForkedProviderBehaviour();
        } else {
          testNormalProviderBehaviour();
        }

        const getLatestBlockNumber = async () => {
          return quantityToNumber(
            await this.ctx.provider.send("eth_blockNumber")
          );
        };

        function testForkedProviderBehaviour() {
          it("can reset the forked provider to a given forkBlockNumber", async function () {
            await this.provider.send("buidler_reset", [
              { jsonRpcUrl: INFURA_URL, blockNumber: 123 },
            ]);
            assert.equal(await getLatestBlockNumber(), 123);
          });

          it("can reset the forked provider to the latest block number", async function () {
            const initialBlock = await getLatestBlockNumber();
            await this.provider.send("buidler_reset", [
              { jsonRpcUrl: INFURA_URL, blockNumber: 123 },
            ]);
            await this.provider.send("buidler_reset", [
              { jsonRpcUrl: INFURA_URL },
            ]);

            // This condition is rather loose as Infura can sometimes return
            // a smaller block number on subsequent eth_blockNumber call
            assert.closeTo(await getLatestBlockNumber(), initialBlock, 2);
          });

          it("can reset the forked provider to a normal provider", async function () {
            await this.provider.send("buidler_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }

        function testNormalProviderBehaviour() {
          it("can reset the provider to initial state", async function () {
            await this.provider.send("evm_mine");
            assert.equal(await getLatestBlockNumber(), 1);
            await this.provider.send("buidler_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });

          it("can reset the provider with a fork config", async function () {
            await this.provider.send("buidler_reset", [
              { jsonRpcUrl: INFURA_URL, blockNumber: 123 },
            ]);
            assert.equal(await getLatestBlockNumber(), 123);
          });

          it("can reset the provider with fork config back to normal config", async function () {
            await this.provider.send("buidler_reset", [
              { jsonRpcUrl: INFURA_URL, blockNumber: 123 },
            ]);
            await this.provider.send("buidler_reset", []);
            assert.equal(await getLatestBlockNumber(), 0);
          });
        }
      });
    });
  });
});
