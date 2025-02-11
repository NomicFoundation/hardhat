import type { SolidityStackTrace } from "./stack-traces/solidity-stack-trace.js";
import type { LoggerConfig } from "./types/logger.js";
import type { TracingConfig } from "./types/node-types.js";
import type {
  EdrNetworkConfig,
  EdrNetworkHDAccountsConfig,
} from "../../../../types/config.js";
import type {
  EthSubscription,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../../types/providers.js";
import type { DefaultHDAccountsConfigParams } from "../accounts/constants.js";
import type { JsonRpcRequestWrapperFunction } from "../network-manager.js";
import type {
  SubscriptionEvent,
  Response,
  Provider,
  ProviderConfig,
} from "@ignored/edr-optimism";

import {
  optimismGenesisState,
  optimismHardforkFromString,
  l1GenesisState,
  l1HardforkFromString,
} from "@ignored/edr-optimism";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { toSeconds } from "@ignored/hardhat-vnext-utils/date";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";
import { deepEqual } from "@ignored/hardhat-vnext-utils/lang";
import debug from "debug";

import { EDR_NETWORK_REVERT_SNAPSHOT_EVENT } from "../../../constants.js";
import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../accounts/constants.js";
import { BaseProvider } from "../base-provider.js";
import { getJsonRpcRequest, isFailedJsonRpcResponse } from "../json-rpc.js";
import {
  InvalidArgumentsError,
  ProviderError,
  UnknownError,
} from "../provider-errors.js";

import { getGlobalEdrContext } from "./edr-context.js";
import { createSolidityErrorWithStackTrace } from "./stack-traces/stack-trace-solidity-errors.js";
import {
  isDebugTraceResult,
  isEdrProviderErrorData,
} from "./type-validation.js";
import { clientVersion } from "./utils/client-version.js";
import { ConsoleLogger } from "./utils/console-logger.js";
import {
  edrRpcDebugTraceToHardhat,
  hardhatMiningIntervalToEdrMiningInterval,
  hardhatMempoolOrderToEdrMineOrdering,
  hardhatHardforkToEdrSpecId,
  hardhatAccountsToEdrOwnedAccounts,
  hardhatChainsToEdrChains,
  hardhatForkingConfigToEdrForkConfig,
  hardhatChainTypeToEdrChainType,
} from "./utils/convert-to-edr.js";
import { printLine, replaceLastLine } from "./utils/logger.js";

const log = debug("hardhat:core:hardhat-network:provider");

export const EDR_NETWORK_DEFAULT_COINBASE =
  "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";

interface EdrNetworkDefaultHDAccountsConfigParams
  extends DefaultHDAccountsConfigParams {
  mnemonic: string;
  accountsBalance: bigint;
}

export const EDR_NETWORK_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_EDR_NETWORK_BALANCE = 10000000000000000000000n;
export const DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS: EdrNetworkDefaultHDAccountsConfigParams =
  {
    ...DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS,
    mnemonic: EDR_NETWORK_MNEMONIC,
    accountsBalance: DEFAULT_EDR_NETWORK_BALANCE,
  };

export async function isDefaultEdrNetworkHDAccountsConfig(
  accounts: EdrNetworkHDAccountsConfig,
): Promise<boolean> {
  return deepEqual(
    {
      ...accounts,
      mnemonic: await accounts.mnemonic.get(),
      passphrase: await accounts.passphrase.get(),
    },
    DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS,
  );
}

export const EDR_NETWORK_DEFAULT_PRIVATE_KEYS: string[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

interface EdrProviderConfig {
  networkConfig: EdrNetworkConfig;
  loggerConfig?: LoggerConfig;
  tracingConfig?: TracingConfig;
  jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;
}

export class EdrProvider extends BaseProvider {
  readonly #jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;

  #provider: Provider | undefined;
  #nextRequestId = 1;

  /**
   * Creates a new instance of `EdrProvider`.
   */
  public static async create({
    networkConfig,
    loggerConfig = { enabled: false },
    tracingConfig = {},
    jsonRpcRequestWrapper,
  }: EdrProviderConfig): Promise<EdrProvider> {
    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const providerConfig = await getProviderConfig(networkConfig);

    let edrProvider: EdrProvider;

    // We need to catch errors here, as the provider creation can panic unexpectedly,
    // and we want to make sure such a crash is propagated as a ProviderError.
    try {
      const context = await getGlobalEdrContext();
      const provider = await context.createProvider(
        hardhatChainTypeToEdrChainType(networkConfig.chainType),
        providerConfig,
        {
          enable: loggerConfig.enabled,
          decodeConsoleLogInputsCallback: ConsoleLogger.getDecodedLogs,
          printLineCallback: (message: string, replace: boolean) => {
            if (replace) {
              replaceLastLineFn(message);
            } else {
              printLineFn(message);
            }
          },
        },
        {
          subscriptionCallback: (event: SubscriptionEvent) => {
            edrProvider.onSubscriptionEvent(event);
          },
        },
        tracingConfig,
      );

      edrProvider = new EdrProvider(provider, jsonRpcRequestWrapper);
    } catch (error) {
      ensureError(error);

      // eslint-disable-next-line no-restricted-syntax -- allow throwing UnknownError
      throw new UnknownError(error.message, error);
    }

    return edrProvider;
  }

  /**
   * @private
   *
   * This constructor is intended for internal use only.
   * Use the static method {@link EdrProvider.create} to create an instance of
   * `EdrProvider`.
   */
  private constructor(
    provider: Provider,
    jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction,
  ) {
    super();

    this.#provider = provider;
    this.#jsonRpcRequestWrapper = jsonRpcRequestWrapper;
  }

  public async request(
    requestArguments: RequestArguments,
  ): Promise<SuccessfulJsonRpcResponse["result"]> {
    if (this.#provider === undefined) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.PROVIDER_CLOSED);
    }

    const { method, params } = requestArguments;

    const jsonRpcRequest = getJsonRpcRequest(
      this.#nextRequestId++,
      method,
      params,
    );

    let jsonRpcResponse: JsonRpcResponse;

    if (this.#jsonRpcRequestWrapper !== undefined) {
      jsonRpcResponse = await this.#jsonRpcRequestWrapper(
        jsonRpcRequest,
        this.#handleRequest.bind(this),
      );
    } else {
      jsonRpcResponse = await this.#handleRequest(jsonRpcRequest);
    }

    // this can only happen if a wrapper doesn't call the default
    // behavior as the default throws on FailedJsonRpcResponse
    if (isFailedJsonRpcResponse(jsonRpcResponse)) {
      const error = new ProviderError(
        jsonRpcResponse.error.message,
        jsonRpcResponse.error.code,
      );
      error.data = jsonRpcResponse.error.data;

      // eslint-disable-next-line no-restricted-syntax -- allow throwing ProviderError
      throw error;
    }

    if (jsonRpcRequest.method === "evm_revert") {
      this.emit(EDR_NETWORK_REVERT_SNAPSHOT_EVENT);
    }

    // Override EDR version string with Hardhat version string with EDR backend,
    // e.g. `HardhatNetwork/2.19.0/@ignored/edr-optimism/0.2.0-dev`
    if (jsonRpcRequest.method === "web3_clientVersion") {
      assertHardhatInvariant(
        typeof jsonRpcResponse.result === "string",
        "Invalid client version response",
      );
      return clientVersion(jsonRpcResponse.result);
    } else if (
      jsonRpcRequest.method === "debug_traceTransaction" ||
      jsonRpcRequest.method === "debug_traceCall"
    ) {
      assertHardhatInvariant(
        isDebugTraceResult(jsonRpcResponse.result),
        "Invalid debug trace response",
      );
      return edrRpcDebugTraceToHardhat(jsonRpcResponse.result);
    } else {
      return jsonRpcResponse.result;
    }
  }

  public async close(): Promise<void> {
    // Clear the provider reference to help with garbage collection
    this.#provider = undefined;
  }

  async #handleEdrResponse(
    edrResponse: Response,
  ): Promise<SuccessfulJsonRpcResponse> {
    let jsonRpcResponse: JsonRpcResponse;

    if (typeof edrResponse.data === "string") {
      jsonRpcResponse = JSON.parse(edrResponse.data);
    } else {
      jsonRpcResponse = edrResponse.data;
    }

    if (isFailedJsonRpcResponse(jsonRpcResponse)) {
      const responseError = jsonRpcResponse.error;
      let error;

      let stackTrace: SolidityStackTrace | null = null;
      try {
        stackTrace = edrResponse.stackTrace();
      } catch (e) {
        log("Failed to get stack trace: %O", e);
      }

      if (stackTrace !== null) {
        // If we have a stack trace, we know that the json rpc response data
        // is an object with the data and transactionHash fields
        assertHardhatInvariant(
          isEdrProviderErrorData(responseError.data),
          "Invalid error data",
        );

        error = createSolidityErrorWithStackTrace(
          responseError.message,
          stackTrace,
          responseError.data.data,
          responseError.data.transactionHash,
        );
      } else {
        error =
          responseError.code === InvalidArgumentsError.CODE
            ? new InvalidArgumentsError(responseError.message)
            : new ProviderError(responseError.message, responseError.code);
        error.data = responseError.data;
      }

      /* eslint-disable-next-line no-restricted-syntax -- we may throw
      non-Hardaht errors inside of an EthereumProvider */
      throw error;
    }

    return jsonRpcResponse;
  }

  public onSubscriptionEvent(event: SubscriptionEvent): void {
    const subscription = numberToHexString(event.filterId);
    const results = Array.isArray(event.result) ? event.result : [event.result];
    for (const result of results) {
      this.#emitLegacySubscriptionEvent(subscription, result);
      this.#emitEip1193SubscriptionEvent(subscription, result);
    }
  }

  #emitLegacySubscriptionEvent(subscription: string, result: unknown) {
    this.emit("notification", {
      subscription,
      result,
    });
  }

  #emitEip1193SubscriptionEvent(subscription: string, result: unknown) {
    const message: EthSubscription = {
      type: "eth_subscription",
      data: {
        subscription,
        result,
      },
    };
    this.emit("message", message);
  }

  async #handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    assertHardhatInvariant(
      this.#provider !== undefined,
      "The provider is not defined",
    );

    const stringifiedArgs = JSON.stringify(request);

    let edrResponse: Response;

    // We need to catch errors here, as the provider creation can panic unexpectedly,
    // and we want to make sure such a crash is propagated as a ProviderError.
    try {
      edrResponse = await this.#provider.handleRequest(stringifiedArgs);
    } catch (error) {
      ensureError(error);

      // eslint-disable-next-line no-restricted-syntax -- allow throwing UnknownError
      throw new UnknownError(error.message, error);
    }

    return this.#handleEdrResponse(edrResponse);
  }
}

async function getProviderConfig(
  networkConfig: EdrNetworkConfig,
): Promise<ProviderConfig> {
  const genesisState =
    networkConfig.forking !== undefined
      ? [] // TODO: Add support for overriding remote fork state when the local fork is different
      : networkConfig.chainType === "optimism"
        ? optimismGenesisState(
            optimismHardforkFromString(
              // TODO: Optimism conversion is not implemented yet
              hardhatHardforkToEdrSpecId(networkConfig.hardfork),
            ),
          )
        : l1GenesisState(
            l1HardforkFromString(
              hardhatHardforkToEdrSpecId(networkConfig.hardfork),
            ),
          );

  return {
    allowBlocksWithSameTimestamp: networkConfig.allowBlocksWithSameTimestamp,
    allowUnlimitedContractSize: networkConfig.allowUnlimitedContractSize,
    bailOnCallFailure: networkConfig.throwOnCallFailures,
    bailOnTransactionFailure: networkConfig.throwOnTransactionFailures,
    blockGasLimit: networkConfig.blockGasLimit,
    cacheDir: networkConfig.forking?.cacheDir,
    chainId: BigInt(networkConfig.chainId),
    chains: hardhatChainsToEdrChains(networkConfig.chains),
    // TODO: remove this cast when EDR updates the interface to accept Uint8Array
    coinbase: Buffer.from(networkConfig.coinbase),
    enableRip7212: networkConfig.enableRip7212,
    fork: await hardhatForkingConfigToEdrForkConfig(networkConfig.forking),
    genesisState,
    hardfork: hardhatHardforkToEdrSpecId(networkConfig.hardfork),
    initialBaseFeePerGas: networkConfig.initialBaseFeePerGas,
    initialDate: BigInt(toSeconds(networkConfig.initialDate)),
    minGasPrice: networkConfig.minGasPrice,
    mining: {
      autoMine: networkConfig.mining.auto,
      interval: hardhatMiningIntervalToEdrMiningInterval(
        networkConfig.mining.interval,
      ),
      memPool: {
        order: hardhatMempoolOrderToEdrMineOrdering(
          networkConfig.mining.mempool.order,
        ),
      },
    },
    networkId: BigInt(networkConfig.networkId),
    ownedAccounts: await hardhatAccountsToEdrOwnedAccounts(
      networkConfig.accounts,
    ),
  };
}
