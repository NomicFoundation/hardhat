import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcServer } from "../../../../src/internal/buidler-evm/jsonrpc/server";
import { BuidlerNode } from "../../../../src/internal/buidler-evm/provider/node";
import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";
import { EthereumProvider } from "../../../../src/types";

declare module "mocha" {
  interface Context {
    provider: EthereumProvider;
    common: Common;
    server?: JsonRpcServer;
  }
}

export const PROVIDERS = [
  {
    name: "BuidlerEVM",
    useProvider: () => {
      useProvider();
    },
  },
  {
    name: "JSON-RPC",
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
];

export const DEFAULT_HARDFORK = "istanbul";
export const DEFAULT_NETWORK_NAME = "TestNet";
export const DEFAULT_CHAIN_ID = 123;
export const DEFAULT_NETWORK_ID = 234;
export const DEFAULT_BLOCK_GAS_LIMIT = 6000000;
export const DEFAULT_ACCOUNTS = [
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
    balance: new BN(10).pow(new BN(18)),
  },
  {
    privateKey:
      "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd10a",
    balance: new BN(10).pow(new BN(18)),
  },
];
export const DEFAULT_USE_JSON_RPC = false;

export function useProvider(
  hardfork = DEFAULT_HARDFORK,
  networkName = DEFAULT_NETWORK_NAME,
  chainId = DEFAULT_CHAIN_ID,
  networkId = DEFAULT_NETWORK_ID,
  blockGasLimit = DEFAULT_BLOCK_GAS_LIMIT,
  accounts = DEFAULT_ACCOUNTS,
  useJsonRpc = DEFAULT_USE_JSON_RPC,
  allowUnlimitedContractSize = false
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
