import { assert } from "chai";
import sinon from "sinon";

import { quantityToNumber } from "../helpers/conversions";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_INTERVAL_MINING_CONFIG,
  INTERVAL_MINING_PROVIDERS,
} from "../helpers/providers";

describe("Interval mining provider", () => {
  INTERVAL_MINING_PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, () => {
      const blockTime = DEFAULT_INTERVAL_MINING_CONFIG.blockTime;
      let clock: sinon.SinonFakeTimers;

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
          const getBlockNumber = async () =>
            quantityToNumber(await this.provider.send("eth_blockNumber"));

          const firstBlock = await getBlockNumber(); // this triggers provider initialization

          await clock.tickAsync(blockTime);
          const secondBlock = await getBlockNumber();

          await clock.tickAsync(blockTime);
          const thirdBlock = await getBlockNumber();

          assert.equal(secondBlock, firstBlock + 1);
          assert.equal(thirdBlock, firstBlock + 2);
        });
      });
    });
  });
});
