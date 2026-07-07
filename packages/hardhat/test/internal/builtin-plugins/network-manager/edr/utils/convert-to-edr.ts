import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AMSTERDAM, SpecId } from "@nomicfoundation/edr";

import {
  getCurrentHardfork,
  L1HardforkName,
  OpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  edrL1HardforkToHardhatL1HardforkName,
  hardhatHardforkToEdrSpecId,
  resolveDefaultTransactionGasLimit,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/convert-to-edr.js";
import {
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../../../src/internal/constants.js";

describe("resolveDefaultTransactionGasLimit", () => {
  const EIP_7825_CAP = 16_777_216n;
  const ARBITRARY_BLOCK_GAS_LIMIT = 42_000_000n;

  describe("when transactionGasCap is unset (hardfork default)", () => {
    describe("L1 chain type", () => {
      it("returns the block gas limit on the hardfork immediately before Osaka", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: L1_CHAIN_TYPE,
            hardfork: L1HardforkName.PRAGUE,
            blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
            transactionGasCap: undefined,
          }),
          ARBITRARY_BLOCK_GAS_LIMIT,
        );
      });

      it("returns the EIP-7825 cap on Osaka", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: L1_CHAIN_TYPE,
            hardfork: L1HardforkName.OSAKA,
            blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
            transactionGasCap: undefined,
          }),
          EIP_7825_CAP,
        );
      });

      it("returns the EIP-7825 cap on the latest L1 hardfork", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: L1_CHAIN_TYPE,
            hardfork: getCurrentHardfork(L1_CHAIN_TYPE),
            blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
            transactionGasCap: undefined,
          }),
          EIP_7825_CAP,
        );
      });
    });

    describe("OP chain type", () => {
      it("returns the block gas limit on the earliest OP hardfork", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: OPTIMISM_CHAIN_TYPE,
            hardfork: OpHardforkName.BEDROCK,
            blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
            transactionGasCap: undefined,
          }),
          ARBITRARY_BLOCK_GAS_LIMIT,
        );
      });

      // TODO: OP UPGRADE 19 - update OP to also set a default transaction gas once enabled
      it("returns the block gas limit on the latest OP hardfork (EIP-7825 not yet activated on OP)", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: OPTIMISM_CHAIN_TYPE,
            hardfork: getCurrentHardfork(OPTIMISM_CHAIN_TYPE),
            blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
            transactionGasCap: undefined,
          }),
          ARBITRARY_BLOCK_GAS_LIMIT,
        );
      });
    });
  });

  describe("when transactionGasCap is a bigint", () => {
    const USER_TX_GAS_CAP = 1_000_000n;

    it("returns the user-set cap, taking precedence over the L1 Osaka EIP-7825 default", () => {
      assert.equal(
        resolveDefaultTransactionGasLimit({
          chainType: L1_CHAIN_TYPE,
          hardfork: L1HardforkName.OSAKA,
          blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
          transactionGasCap: USER_TX_GAS_CAP,
        }),
        USER_TX_GAS_CAP,
      );
    });

    it("returns the user-set cap on OP", () => {
      assert.equal(
        resolveDefaultTransactionGasLimit({
          chainType: OPTIMISM_CHAIN_TYPE,
          hardfork: getCurrentHardfork(OPTIMISM_CHAIN_TYPE),
          blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
          transactionGasCap: USER_TX_GAS_CAP,
        }),
        USER_TX_GAS_CAP,
      );
    });
  });

  describe("when transactionGasCap is false", () => {
    it("returns the block gas limit on L1 Osaka, bypassing the EIP-7825 default", () => {
      assert.equal(
        resolveDefaultTransactionGasLimit({
          chainType: L1_CHAIN_TYPE,
          hardfork: L1HardforkName.OSAKA,
          blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
          transactionGasCap: false,
        }),
        ARBITRARY_BLOCK_GAS_LIMIT,
      );
    });

    it("returns the block gas limit on OP", () => {
      assert.equal(
        resolveDefaultTransactionGasLimit({
          chainType: OPTIMISM_CHAIN_TYPE,
          hardfork: getCurrentHardfork(OPTIMISM_CHAIN_TYPE),
          blockGasLimit: ARBITRARY_BLOCK_GAS_LIMIT,
          transactionGasCap: false,
        }),
        ARBITRARY_BLOCK_GAS_LIMIT,
      );
    });
  });
});

describe("Amsterdam L1 hardfork conversion round-trip", () => {
  it("maps the AMSTERDAM name to EDR's Amsterdam spec id", () => {
    assert.equal(
      hardhatHardforkToEdrSpecId(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE),
      AMSTERDAM,
    );
  });

  it("maps EDR's Amsterdam spec id back to the AMSTERDAM name", () => {
    assert.equal(
      edrL1HardforkToHardhatL1HardforkName(SpecId.Amsterdam),
      L1HardforkName.AMSTERDAM,
    );
  });
});
