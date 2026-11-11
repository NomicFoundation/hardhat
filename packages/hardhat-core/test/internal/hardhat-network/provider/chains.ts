import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { HardforkName } from "../../../../src/internal/util/hardforks";
import { ALCHEMY_URL } from "../../../setup";
import { useProvider } from "../helpers/useProvider";

const MAINNET_CHAIN_ID = 1;

/** A pre-merge mainnet block, which EDR runs under London rules. */
const HISTORICAL_BLOCK_NUMBER = 15_000_000;
const FORK_BLOCK_NUMBER = HISTORICAL_BLOCK_NUMBER + 100;

/** Init code `PUSH0 PUSH0 RETURN`, which is valid only from Shanghai on. */
const PUSH0_INIT_CODE = "0x5f5ff3";

describe("Hardhat Network chains config", function () {
  if (ALCHEMY_URL === undefined) {
    return;
  }

  const forkConfig = {
    jsonRpcUrl: ALCHEMY_URL,
    blockNumber: FORK_BLOCK_NUMBER,
  };

  async function callPush0AtHistoricalBlock(
    this: Mocha.Context
  ): Promise<string> {
    return this.provider.send("eth_call", [
      { data: PUSH0_INIT_CODE },
      numberToRpcQuantity(HISTORICAL_BLOCK_NUMBER),
    ]);
  }

  describe("without a chains entry for the forked chain", function () {
    useProvider({ forkConfig });

    it("rejects PUSH0 at a pre-Shanghai block", async function () {
      await assert.isRejected(
        callPush0AtHistoricalBlock.call(this),
        /invalid opcode/
      );
    });
  });

  const chains = new Map([
    [
      MAINNET_CHAIN_ID,
      { hardforkHistory: new Map([[HardforkName.SHANGHAI, 0]]) },
    ],
  ]);

  describe("with a chains entry for the forked chain", function () {
    useProvider({ forkConfig, chains });

    it("executes PUSH0 at a pre-Shanghai block when the history starts Shanghai at 0", async function () {
      assert.equal(await callPush0AtHistoricalBlock.call(this), "0x");
    });

    it("executes PUSH0 at a pre-Shanghai block after a forking hardhat_reset", async function () {
      await this.provider.send("hardhat_reset", [{ forking: forkConfig }]);

      assert.equal(await callPush0AtHistoricalBlock.call(this), "0x");
    });
  });

  describe("with a chains entry and no initial fork", function () {
    useProvider({ chains });

    it("executes PUSH0 at a pre-Shanghai block after a forking hardhat_reset", async function () {
      await this.provider.send("hardhat_reset", [{ forking: forkConfig }]);

      assert.equal(await callPush0AtHistoricalBlock.call(this), "0x");
    });
  });
});
