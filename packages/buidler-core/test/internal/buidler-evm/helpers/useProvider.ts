import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { BuidlerNode } from "../../../../src/internal/buidler-evm/provider/node";
import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";

declare module "mocha" {
  interface Context {
    provider: BuidlerEVMProvider;
    common: Common;
  }
}

export const DEFAULT_HARDFORK = "petersburg";
export const DEFAULT_NETWORK_NAME = "TestNet";
export const DEFAULT_CHAIN_ID = 123;
export const DEFAULT_NETWORK_ID = 234;
export const DEFAULT_BLOCK_GAS_LIMIT = 6000000;
export const DEFAULT_ACCOUNTS = [
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
    balance: new BN(10).pow(new BN(18))
  },
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd10a",
    balance: new BN(10).pow(new BN(18))
  }
];

export function useProvider(
  hardfork = DEFAULT_HARDFORK,
  networkName = DEFAULT_NETWORK_NAME,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS
) {
  beforeEach("Initialize provider", async function() {
    // We create two Nodes here, and don't use this one.
    // We should probably change this. This is done to get the common.
    const [common, _] = await BuidlerNode.create(
      hardfork,
      networkName,
      chainId,
      networkId,
      blockGasLimit,
      true,
      true,
      accounts
    );

    this.common = common;
    this.provider = new BuidlerEVMProvider(
      hardfork,
      networkName,
      chainId,
      networkId,
      blockGasLimit,
      true,
      true,
      accounts
    );
  });

  afterEach("Remove provider", async function() {
    delete this.common;
    delete this.provider;
  });
}
