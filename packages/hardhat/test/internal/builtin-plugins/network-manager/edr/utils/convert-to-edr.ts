import type { ChainDescriptorsConfig } from "../../../../../../src/types/config.js";
import type { ChainType } from "../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GasEstimationMode, L1Hardfork } from "@nomicfoundation/edr";

import {
  getCurrentHardfork,
  L1HardforkName,
  OpHardforkName,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import {
  edrL1HardforkToHardhatL1HardforkName,
  hardhatChainDescriptorsToEdrChainOverrides,
  hardhatGasEstimationModeToEdrGasEstimationMode,
  hardhatMiningIntervalToEdrMiningInterval,
  resolveDefaultTransactionGasLimit,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/convert-to-edr.js";
import { getHardforkName } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/utils/hardfork.js";
import {
  GENERIC_CHAIN_TYPE,
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
  it("passes the AMSTERDAM name through to EDR", () => {
    assert.equal(
      getHardforkName(L1HardforkName.AMSTERDAM, L1_CHAIN_TYPE),
      L1HardforkName.AMSTERDAM,
    );
  });

  it("maps EDR's Amsterdam hardfork back to the AMSTERDAM name", () => {
    assert.equal(
      edrL1HardforkToHardhatL1HardforkName(L1Hardfork.Amsterdam),
      L1HardforkName.AMSTERDAM,
    );
  });
});

describe("hardhatMiningIntervalToEdrMiningInterval", () => {
  it("disables interval mining for a scalar 0", () => {
    assert.equal(hardhatMiningIntervalToEdrMiningInterval(0), undefined);
  });

  it("converts a scalar interval to a bigint", () => {
    assert.equal(hardhatMiningIntervalToEdrMiningInterval(5000), 5000n);
  });

  it("converts a range as it is", () => {
    assert.deepEqual(hardhatMiningIntervalToEdrMiningInterval([1000, 5000]), {
      min: 1000n,
      max: 5000n,
    });
  });

  it("raises a range minimum of 0 to 1", () => {
    assert.deepEqual(hardhatMiningIntervalToEdrMiningInterval([0, 5000]), {
      min: 1n,
      max: 5000n,
    });
  });

  it("raises both bounds of a [0, 0] range to 1", () => {
    assert.deepEqual(hardhatMiningIntervalToEdrMiningInterval([0, 0]), {
      min: 1n,
      max: 1n,
    });
  });
});

describe("hardhatChainDescriptorsToEdrChainOverrides", () => {
  it("converts block-number and timestamp activations to bigint conditions", () => {
    const chainDescriptors: ChainDescriptorsConfig = new Map([
      [
        1n,
        {
          name: "Mainnet",
          chainType: L1_CHAIN_TYPE,
          blockExplorers: {},
          hardforkHistory: new Map([
            [L1HardforkName.LONDON, { blockNumber: 12_965_000 }],
            [L1HardforkName.CANCUN, { timestamp: 1_710_338_135 }],
          ]),
        },
      ],
    ]);

    const overrides = hardhatChainDescriptorsToEdrChainOverrides(
      chainDescriptors,
      L1_CHAIN_TYPE,
    );

    assert.deepEqual(overrides[0].hardforkActivationOverrides, [
      {
        condition: { blockNumber: 12_965_000n },
        hardfork: L1HardforkName.LONDON,
      },
      {
        condition: { timestamp: 1_710_338_135n },
        hardfork: L1HardforkName.CANCUN,
      },
    ]);
  });

  it("omits hardforkActivationOverrides when there is no hardfork history", () => {
    const chainDescriptors: ChainDescriptorsConfig = new Map([
      [1n, { name: "Mainnet", chainType: L1_CHAIN_TYPE, blockExplorers: {} }],
    ]);

    const overrides = hardhatChainDescriptorsToEdrChainOverrides(
      chainDescriptors,
      L1_CHAIN_TYPE,
    );

    assert.deepEqual(overrides, [{ chainId: 1n, name: "Mainnet" }]);
  });

  describe("chain type selection", () => {
    const chainDescriptors: ChainDescriptorsConfig = new Map([
      [1n, { name: "Mainnet", chainType: L1_CHAIN_TYPE, blockExplorers: {} }],
      [
        10n,
        {
          name: "OP Mainnet",
          chainType: OPTIMISM_CHAIN_TYPE,
          blockExplorers: {},
        },
      ],
      [
        999n,
        {
          name: "Some Chain",
          chainType: GENERIC_CHAIN_TYPE,
          blockExplorers: {},
        },
      ],
    ]);

    const chainIdsFor = (chainType: ChainType) =>
      hardhatChainDescriptorsToEdrChainOverrides(
        chainDescriptors,
        chainType,
      ).map(({ chainId }) => chainId);

    it("includes both generic and l1 chains when generic is requested", () => {
      assert.deepEqual(chainIdsFor(GENERIC_CHAIN_TYPE), [1n, 999n]);
    });

    it("includes only exact matches for a specific chain type", () => {
      assert.deepEqual(chainIdsFor(L1_CHAIN_TYPE), [1n]);
      assert.deepEqual(chainIdsFor(OPTIMISM_CHAIN_TYPE), [10n]);
    });
  });
});
