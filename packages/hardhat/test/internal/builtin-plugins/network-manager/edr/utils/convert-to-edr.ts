import type { EdrNetworkConfig } from "../../../../../../src/types/config.js";
import type { RequireField } from "../../../../../../src/types/utils.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AMSTERDAM, GasEstimationMode, SpecId } from "@nomicfoundation/edr";

import { DEFAULT_EDR_NETWORK_BLOCK_GAS_LIMIT } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/edr-constants.js";
import {
  getCurrentHardfork,
  L1HardforkName,
  OpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  edrL1HardforkToHardhatL1HardforkName,
  hardhatGasEstimationModeToEdrGasEstimationMode,
  hardhatHardforkToEdrSpecId,
  resolveDefaultTransactionGasLimit,
  resolveEdrDefaultTransactionGasLimit,
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

      it("caps the EIP-7825 default to the block gas limit on Osaka when it is lower", () => {
        assert.equal(
          resolveDefaultTransactionGasLimit({
            chainType: L1_CHAIN_TYPE,
            hardfork: L1HardforkName.OSAKA,
            blockGasLimit: 5_000_000n,
            transactionGasCap: undefined,
          }),
          5_000_000n,
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

    it("caps the user-set cap to the block gas limit when it is higher", () => {
      assert.equal(
        resolveDefaultTransactionGasLimit({
          chainType: L1_CHAIN_TYPE,
          hardfork: L1HardforkName.OSAKA,
          blockGasLimit: 30_000_000n,
          transactionGasCap: 40_000_000n,
        }),
        30_000_000n,
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

describe("resolveEdrDefaultTransactionGasLimit", () => {
  function makeNetworkConfigStub(
    overrides: Partial<EdrNetworkConfig> = {},
  ): RequireField<EdrNetworkConfig, "chainType"> {
    return {
      type: "edr-simulated",
      accounts: [],
      chainId: 31337,
      chainType: "l1",
      gas: "auto",
      gasMultiplier: 1,
      gasPrice: "auto",
      allowBlocksWithSameTimestamp: false,
      coinbase: new Uint8Array(20),
      gasEstimationMode: "topLevelSuccess",
      hardfork: L1HardforkName.PRAGUE,
      initialDate: new Date(),
      loggingEnabled: false,
      minGasPrice: 0n,
      mining: { auto: true, interval: 0, mempool: { order: "priority" } },
      networkId: 31337,
      throwOnCallFailures: true,
      throwOnTransactionFailures: true,
      ...overrides,
    };
  }

  it("uses the configured block gas limit when it is a bigint", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(
        makeNetworkConfigStub({ blockGasLimit: 42_000_000n }),
      ),
      42_000_000n,
    );
  });

  it("uses the default block gas limit when blockGasLimit is not set", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(makeNetworkConfigStub()),
      DEFAULT_EDR_NETWORK_BLOCK_GAS_LIMIT,
    );
  });

  it("uses the default block gas limit when blockGasLimit is false", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(
        makeNetworkConfigStub({ blockGasLimit: false }),
      ),
      DEFAULT_EDR_NETWORK_BLOCK_GAS_LIMIT,
    );
  });

  it("applies the hardfork-specific default on Osaka", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(
        makeNetworkConfigStub({
          blockGasLimit: 42_000_000n,
          hardfork: L1HardforkName.OSAKA,
        }),
      ),
      16_777_216n,
    );
  });

  it("caps the hardfork-specific default to the block gas limit on Osaka when it is lower", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(
        makeNetworkConfigStub({
          blockGasLimit: 5_000_000n,
          hardfork: L1HardforkName.OSAKA,
        }),
      ),
      5_000_000n,
    );
  });

  it("applies the transactionGasCap when it is set", () => {
    assert.equal(
      resolveEdrDefaultTransactionGasLimit(
        makeNetworkConfigStub({
          blockGasLimit: 42_000_000n,
          hardfork: L1HardforkName.OSAKA,
          transactionGasCap: 1_000_000n,
        }),
      ),
      1_000_000n,
    );
  });
});

describe("hardhatGasEstimationModeToEdrGasEstimationMode", () => {
  it("maps the hardhat gas estimation modes to the EDR ones", () => {
    assert.equal(
      hardhatGasEstimationModeToEdrGasEstimationMode("topLevelSuccess"),
      GasEstimationMode.TopLevelSuccess,
    );

    assert.equal(
      hardhatGasEstimationModeToEdrGasEstimationMode("noInternalOutOfGas"),
      GasEstimationMode.NoInternalOutOfGas,
    );
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
