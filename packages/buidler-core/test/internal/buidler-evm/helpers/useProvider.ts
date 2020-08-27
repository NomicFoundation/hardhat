import { JsonRpcServer } from "../../../../src/internal/buidler-evm/jsonrpc/server";
import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";
import { EthereumProvider } from "../../../../src/types";

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  DEFAULT_USE_JSON_RPC,
  INFURA_CHAIN_ID,
  INFURA_NETWORK_ID,
  INFURA_URL,
} from "./constants";
import { useForkedProvider } from "./useForkedProvider";

declare module "mocha" {
  interface Context {
    provider: EthereumProvider;
    server?: JsonRpcServer;
  }
}

export const PROVIDERS = [
  {
    name: "BuidlerEVM",
    isFork: false,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: () => {
      useProvider();
    },
  },
  {
    name: "JSON-RPC",
    isFork: false,
    networkId: DEFAULT_NETWORK_ID,
    chainId: DEFAULT_CHAIN_ID,
    useProvider: () => {
      useProvider(true);
    },
  },
  {
    name: "Forked",
    isFork: true,
    networkId: INFURA_NETWORK_ID,
    chainId: INFURA_CHAIN_ID,
    useProvider: () => {
      useForkedProvider({ jsonRpcUrl: INFURA_URL });
    },
  },
];

export function useProvider(
  useJsonRpc = DEFAULT_USE_JSON_RPC,
  hardfork = DEFAULT_HARDFORK,
  networkName = DEFAULT_NETWORK_NAME,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS,
  allowUnlimitedContractSize = DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE
) {
  beforeEach("Initialize provider", async function () {
    this.provider = new BuidlerEVMProvider(
      hardfork,
      networkName,
      chainId,
      networkId,
      blockGasLimit,
      true,
      true,
      accounts,
      undefined,
      undefined,
      undefined,
      allowUnlimitedContractSize
    );

    if (useJsonRpc) {
      this.server = new JsonRpcServer({
        port: 0,
        hostname: "localhost",
        provider: this.provider,
      });

      await this.server.listen();

      this.provider = this.server.getProvider();
    }
  });

  afterEach("Remove provider", async function () {
    delete this.provider;

    if (this.server !== undefined) {
      await this.server.close();
      delete this.server;
    }
  });
}
