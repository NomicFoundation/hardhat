import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";
import { EthereumProvider, ForkConfig } from "../../../../src/types";

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "./useProvider";

declare module "mocha" {
  interface Context {
    provider: EthereumProvider;
  }
}

export function useForkedProvider(forkConfig: ForkConfig) {
  beforeEach("Initialize provider", async function () {
    this.provider = new BuidlerEVMProvider(
      DEFAULT_HARDFORK,
      DEFAULT_NETWORK_NAME,
      DEFAULT_CHAIN_ID,
      DEFAULT_NETWORK_ID,
      DEFAULT_BLOCK_GAS_LIMIT,
      true,
      true,
      DEFAULT_ACCOUNTS,
      undefined,
      undefined,
      undefined,
      DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
      undefined,
      forkConfig
    );
  });

  afterEach("Remove provider", async function () {
    delete this.provider;
  });
}
