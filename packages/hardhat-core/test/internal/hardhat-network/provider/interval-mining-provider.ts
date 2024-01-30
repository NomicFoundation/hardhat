import { assert } from "chai";

import { rpcQuantityToNumber } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { ALCHEMY_URL } from "../../../setup";
import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../helpers/cwd";
import { INTERVAL_MINING_PROVIDERS } from "../helpers/providers";
import { sleep } from "../helpers/sleep";

describe("Interval mining provider", function () {
  INTERVAL_MINING_PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      const safeBlockInThePast = 11_200_000;
      const blockTime = 100;
      const blockWaitTime = blockTime + 10;

      const getBlockNumber = async () => {
        return rpcQuantityToNumber(
          await this.ctx.provider.send("eth_blockNumber")
        );
      };

      afterEach(async function () {
        await this.provider.send("evm_setIntervalMining", [0]);
      });

      setCWD();
      useProvider();

      describe("initialization", () => {
        it("starts interval mining automatically", async function () {
          const firstBlock = await getBlockNumber(); // this triggers provider initialization

          await sleep(blockWaitTime);
          const secondBlock = await getBlockNumber();

          await sleep(blockWaitTime);
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

            await sleep(blockWaitTime);
            const secondBlockBeforeReset = await getBlockNumber();

            await this.provider.send("hardhat_reset", [
              {
                forking: {
                  jsonRpcUrl: ALCHEMY_URL,
                  blockNumber: safeBlockInThePast,
                },
              },
            ]);

            await sleep(blockWaitTime);
            const secondBlockAfterReset = await getBlockNumber();

            await sleep(blockWaitTime);
            const thirdBlock = await getBlockNumber();

            assert.equal(secondBlockBeforeReset, firstBlock + 1);
            assert.equal(secondBlockAfterReset, safeBlockInThePast + 1);
            assert.equal(thirdBlock, safeBlockInThePast + 2);
          });
        }

        function testNormalProviderBehaviour() {
          it("starts interval mining", async function () {
            const firstBlock = await getBlockNumber();

            await sleep(blockWaitTime);
            const secondBlockBeforeReset = await getBlockNumber();

            await this.provider.send("hardhat_reset");

            await sleep(blockWaitTime);
            const secondBlockAfterReset = await getBlockNumber();

            await sleep(blockWaitTime);
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
