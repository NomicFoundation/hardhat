import { assert } from "chai";
import sinon from "sinon";

import { ALCHEMY_URL } from "../../../setup";
import { quantityToNumber } from "../helpers/conversions";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_INTERVAL_MINING_CONFIG,
  INTERVAL_MINING_PROVIDERS,
} from "../helpers/providers";

describe("Interval mining provider", () => {
  INTERVAL_MINING_PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    describe(`${name} provider`, function () {
      const safeBlockInThePast = 11_200_000;
      const blockTime = DEFAULT_INTERVAL_MINING_CONFIG.blockTime;
      let clock: sinon.SinonFakeTimers;

      const getBlockNumber = async () => {
        return quantityToNumber(
          await this.ctx.provider.send("eth_blockNumber")
        );
      };

      beforeEach(() => {
        clock = sinon.useFakeTimers({
          now: Date.now(),
          toFake: ["Date", "setTimeout", "clearTimeout"],
        });
      });

      afterEach(async function () {
        await this.provider.send("evm_setIntervalMining", [{ enabled: false }]);
        clock.restore();
      });

      setCWD();
      useProvider();

      describe("initialization", () => {
        it("starts interval mining automatically", async function () {
          const firstBlock = await getBlockNumber(); // this triggers provider initialization

          await clock.tickAsync(blockTime);
          const secondBlock = await getBlockNumber();

          await clock.tickAsync(blockTime);
          const thirdBlock = await getBlockNumber();

          assert.equal(secondBlock, firstBlock + 1);
          assert.equal(thirdBlock, firstBlock + 2);
        });
      });

      describe("hardhat_reset", function () {
        if (isFork) {
          testForkedProviderBehaviour();
        } else {
          testNormalProviderBehaviour();
        }

        function testForkedProviderBehaviour() {
          it("starts interval mining", async function () {
            const firstBlock = await getBlockNumber();

            await clock.tickAsync(blockTime);
            const secondBlockBeforeReset = await getBlockNumber();

            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);

            await clock.tickAsync(blockTime);
            const secondBlockAfterReset = await getBlockNumber();

            await clock.tickAsync(blockTime);
            const thirdBlock = await getBlockNumber();

            assert.equal(secondBlockBeforeReset, firstBlock + 1);
            assert.equal(secondBlockAfterReset, safeBlockInThePast + 1);
            assert.equal(thirdBlock, safeBlockInThePast + 2);
          });
        }

        function testNormalProviderBehaviour() {
          it("starts interval mining", async function () {
            const firstBlock = await getBlockNumber();

            await clock.tickAsync(blockTime);
            const secondBlockBeforeReset = await getBlockNumber();

            await this.provider.send("hardhat_reset");

            await clock.tickAsync(blockTime);
            const secondBlockAfterReset = await getBlockNumber();

            await clock.tickAsync(blockTime);
            const thirdBlock = await getBlockNumber();

            assert.equal(secondBlockBeforeReset, firstBlock + 1);
            assert.equal(secondBlockAfterReset, firstBlock + 1);
            assert.equal(thirdBlock, firstBlock + 2);
          });
        }
      });
    });
  });
});
