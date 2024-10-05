import type { HardhatNetworkChainsConfig } from "./types/config.js";
import type { LoggerConfig } from "./types/logger.js";
import type {
  GenesisAccount,
  MempoolOrder,
  NodeConfig,
  TracingConfig,
} from "./types/node-types.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../../types/providers.js";
import type {
  EdrContext,
  ForkConfig,
  SubscriptionEvent,
} from "@nomicfoundation/edr";

import EventEmitter from "node:events";
import util from "node:util";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { requireNapiRsModule } from "../utils/require-napi-rs-module.js";

import { ConsoleLogger } from "./utils/console-logger.js";
import {
  ethereumjsIntervalMiningConfigToEdr,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "./utils/convert-to-edr.js";
import { getHardforkName } from "./utils/hardfork.js";
import { printLine, replaceLastLine } from "./utils/logger.js";
import { makeCommon } from "./utils/make-common.js";
import { createVmTraceDecoder } from "./utils/stack-traces.js";
import { getMinimalEthereumJsVm } from "./utils/vm.js";

export type IntervalMiningConfig = number | [number, number];

interface HardhatNetworkProviderConfig {
  hardfork: string;
  chainId: number;
  networkId: number;
  blockGasLimit: number;
  minGasPrice: bigint;
  automine: boolean;
  intervalMining: IntervalMiningConfig;
  mempoolOrder: MempoolOrder;
  chains: HardhatNetworkChainsConfig;
  genesisAccounts: GenesisAccount[];
  allowUnlimitedContractSize: boolean;
  throwOnTransactionFailures: boolean;
  throwOnCallFailures: boolean;
  allowBlocksWithSameTimestamp: boolean;

  initialBaseFeePerGas?: number;
  initialDate?: Date;
  coinbase?: string;
  forkConfig?: ForkConfig;
  forkCachePath?: string;
  enableTransientStorage: boolean;
  enableRip7212: boolean;
}

export const DEFAULT_COINBASE = "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";
let _globalEdrContext: EdrContext | undefined;

// Lazy initialize the global EDR context.
export async function getGlobalEdrContext(): Promise<EdrContext> {
  const { EdrContext } = await import("@nomicfoundation/edr");

  if (_globalEdrContext === undefined) {
    // Only one is allowed to exist
    _globalEdrContext = new EdrContext();
  }

  return _globalEdrContext;
}

export function getNodeConfig(
  config: HardhatNetworkProviderConfig,
  tracingConfig?: TracingConfig,
): NodeConfig {
  return {
    automine: config.automine,
    blockGasLimit: config.blockGasLimit,
    minGasPrice: config.minGasPrice,
    genesisAccounts: config.genesisAccounts,
    allowUnlimitedContractSize: config.allowUnlimitedContractSize,
    tracingConfig,
    initialBaseFeePerGas: config.initialBaseFeePerGas,
    mempoolOrder: config.mempoolOrder,
    hardfork: config.hardfork,
    chainId: config.chainId,
    networkId: config.networkId,
    initialDate: config.initialDate,
    forkConfig: config.forkConfig,
    forkCachePath:
      config.forkConfig !== undefined ? config.forkCachePath : undefined,
    coinbase: config.coinbase ?? DEFAULT_COINBASE,
    chains: config.chains,
    allowBlocksWithSameTimestamp: config.allowBlocksWithSameTimestamp,
    enableTransientStorage: config.enableTransientStorage,
  };
}

// TODO: can this just be an event emitter?
class EdrProviderEventAdapter extends EventEmitter {}

export class EdrProvider extends EventEmitter implements EthereumProvider {
  public static async create(
    config: HardhatNetworkProviderConfig,
    loggerConfig: LoggerConfig,
  ): Promise<EdrProvider> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- hack
    const { Provider } = requireNapiRsModule(
      "@nomicfoundation/edr",
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- hack
    ) as typeof import("@nomicfoundation/edr");

    const coinbase = config.coinbase ?? DEFAULT_COINBASE;

    let fork;
    if (config.forkConfig !== undefined) {
      fork = {
        jsonRpcUrl: config.forkConfig.jsonRpcUrl,
        blockNumber:
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
      };
    }

    const initialDate =
      config.initialDate !== undefined
        ? BigInt(Math.floor(config.initialDate.getTime() / 1000))
        : undefined;

    // To accomodate construction ordering, we need an adapter to forward events
    // from the EdrProvider callback to the wrapper's listener
    const eventAdapter = new EdrProviderEventAdapter();

    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const vmTraceDecoder = await createVmTraceDecoder();

    const hardforkName = getHardforkName(config.hardfork);

    const provider = await Provider.withConfig(
      await getGlobalEdrContext(),
      {
        allowBlocksWithSameTimestamp:
          config.allowBlocksWithSameTimestamp ?? false,
        allowUnlimitedContractSize: config.allowUnlimitedContractSize,
        bailOnCallFailure: config.throwOnCallFailures,
        bailOnTransactionFailure: config.throwOnTransactionFailures,
        blockGasLimit: BigInt(config.blockGasLimit),
        chainId: BigInt(config.chainId),
        chains: await this.#convertToEdrChains(config.chains),
        cacheDir: config.forkCachePath,
        coinbase: Buffer.from(coinbase.slice(2), "hex"),
        enableRip7212: config.enableRip7212,
        fork,
        hardfork: await ethereumsjsHardforkToEdrSpecId(hardforkName),
        genesisAccounts: config.genesisAccounts.map((account) => {
          return {
            secretKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        }),
        initialDate,
        initialBaseFeePerGas:
          config.initialBaseFeePerGas !== undefined
            ? BigInt(config.initialBaseFeePerGas)
            : undefined,
        minGasPrice: config.minGasPrice,
        mining: {
          autoMine: config.automine,
          interval: ethereumjsIntervalMiningConfigToEdr(config.intervalMining),
          memPool: {
            order: await ethereumjsMempoolOrderToEdrMineOrdering(
              config.mempoolOrder,
            ),
          },
        },
        networkId: BigInt(config.networkId),
      },
      {
        enable: loggerConfig.enabled,
        decodeConsoleLogInputsCallback: ConsoleLogger.getDecodedLogs,
        getContractAndFunctionNameCallback: (
          code: Buffer,
          calldata?: Buffer,
        ) => {
          return vmTraceDecoder.getContractAndFunctionNamesForCall(
            code,
            calldata,
          );
        },
        printLineCallback: (message: string, replace: boolean) => {
          if (replace) {
            replaceLastLineFn(message);
          } else {
            printLineFn(message);
          }
        },
      },
      (event: SubscriptionEvent) => {
        eventAdapter.emit("ethEvent", event);
      },
    );

    const minimalEthereumJsNode = {
      _vm: getMinimalEthereumJsVm(provider),
    };

    const common = makeCommon(getNodeConfig(config));

    console.log(common, minimalEthereumJsNode);
    const edrProvider = new EdrProvider();

    return edrProvider;
  }

  constructor() {
    super();
  }

  public async request(_requestArguments: RequestArguments): Promise<unknown> {
    return null;
  }

  public async close(): Promise<void> {}

  public async send(method: string, params?: unknown[]): Promise<unknown> {
    return this.request({ method, params });
  }

  public sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void {
    // TODO: this is a straight copy of the HTTP Provider,
    // can we pull this out and share the logic.
    const handleJsonRpcRequest = async () => {
      let jsonRpcResponse: JsonRpcResponse;
      try {
        const result = await this.request({
          method: jsonRpcRequest.method,
          params: jsonRpcRequest.params,
        });

        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result,
        };
      } catch (error) {
        ensureError(error);

        if (!("code" in error) || error.code === undefined) {
          throw error;
        }

        /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        -- Allow string interpolation of unknown `error.code`. It will be converted
        to a number, and we will handle NaN cases appropriately afterwards. */
        const errorCode = parseInt(`${error.code}`, 10);
        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          error: {
            code: !isNaN(errorCode) ? errorCode : -1,
            message: error.message,
            data: {
              stack: error.stack,
              name: error.name,
            },
          },
        };
      }

      return jsonRpcResponse;
    };

    util.callbackify(handleJsonRpcRequest)(callback);
  }

  static async #convertToEdrChains(chains: HardhatNetworkChainsConfig) {
    const edrChains = [];

    for (const [chainId, hardforkConfig] of chains) {
      const hardforks = [];

      for (const [hardfork, blockNumber] of hardforkConfig.hardforkHistory) {
        const specId = await ethereumsjsHardforkToEdrSpecId(
          getHardforkName(hardfork),
        );

        hardforks.push({
          blockNumber: BigInt(blockNumber),
          specId,
        });
      }

      edrChains.push({
        chainId: BigInt(chainId),
        hardforks,
      });
    }

    return edrChains;
  }
}
