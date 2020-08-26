import Common from "ethereumjs-common";

import { JsonRpcServer } from "../../../../src/internal/buidler-evm/jsonrpc/server";
import { BuidlerNode } from "../../../../src/internal/buidler-evm/provider/node";
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
  INFURA_URL,
} from "./constants";
import { useForkedProvider } from "./useForkedProvider";

declare module "mocha" {
  interface Context {
    provider: EthereumProvider;
    common: Common;
    server?: JsonRpcServer;
  }
}

const FORK_CONFIG = { jsonRpcUrl: INFURA_URL, blockNumberOrHash: undefined };

export const PROVIDERS = [
  {
    name: "BuidlerEVM",
    isFork: false,
    useProvider: () => {
      useProvider();
    },
  },
  {
    name: "JSON-RPC",
    isFork: false,
    useProvider: () => {
      useProvider(
        DEFAULT_HARDFORK,
        DEFAULT_NETWORK_NAME,
        DEFAULT_CHAIN_ID,
        DEFAULT_NETWORK_ID,
        DEFAULT_BLOCK_GAS_LIMIT,
        DEFAULT_ACCOUNTS,
        true
      );
    },
  },
  {
    name: "Forked",
    isFork: true,
    useProvider: () => {
      useForkedProvider(FORK_CONFIG);
    },
  },
];

export function useProvider(
  hardfork = DEFAULT_HARDFORK,
  networkName = DEFAULT_NETWORK_NAME,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS,
  useJsonRpc = DEFAULT_USE_JSON_RPC,
  allowUnlimitedContractSize = DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE
) {
  beforeEach("Initialize provider", async function () {
    // We create two Nodes here, and don't use this one.
    // We should probably change this. This is done to get the common.
    const [common, _] = await BuidlerNode.create(
      hardfork,
      networkName,
      chainId,
      networkId,
      blockGasLimit,
      accounts,
      undefined,
      allowUnlimitedContractSize
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
    delete this.common;
    delete this.provider;

    if (this.server !== undefined) {
      await this.server.close();

      delete this.server;
    }
  });
}
