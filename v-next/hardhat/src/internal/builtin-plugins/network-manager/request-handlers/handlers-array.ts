import type { RequestHandler } from "./types.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { isHttpNetworkHdAccountsConfig } from "../type-validation.js";

/**
 * This function returns an handlers array based on the values in the NetworkConnection and NetworkConfig.
 * The order of the handlers, if all are present, is: chain handler, gas handlers (gasPrice first, then gas), sender handler and accounts handler.
 * The order is important to get a correct result when the handlers are executed.
 */
export async function createHandlersArray<
  ChainTypeT extends ChainType | string,
>(networkConnection: NetworkConnection<ChainTypeT>): Promise<RequestHandler[]> {
  const requestHandlers = [];

  const networkConfig = networkConnection.networkConfig;

  if (networkConfig.type === "http" && networkConfig.chainId !== undefined) {
    const { ChainIdValidatorHandler } = await import(
      "./handlers/chain-id/chain-id-handler.js"
    );
    requestHandlers.push(
      new ChainIdValidatorHandler(
        networkConnection.provider,
        networkConfig.chainId,
      ),
    );
  }

  if (
    networkConfig.gasPrice === undefined ||
    networkConfig.gasPrice === "auto"
  ) {
    const { AutomaticGasPriceHandler } = await import(
      "./handlers/gas/automatic-gas-price-handler.js"
    );
    // If you use a hook handler that signs locally, you are required to
    // have all the transaction fields available, including the
    // gasPrice / maxFeePerGas & maxPriorityFeePerGas.
    //
    // We never use those when using EDR Network, as we sign within the
    // EDR Network itself. This means that we don't need to provide all the
    // fields, as the missing ones will be resolved there.
    //
    // EDR Network handles this in a more performant way, so we don't use
    // the AutomaticGasPrice for it.
    requestHandlers.push(
      new AutomaticGasPriceHandler(networkConnection.provider),
    );
  } else {
    const { FixedGasPriceHandler } = await import(
      "./handlers/gas/fixed-gas-price-handler.js"
    );
    requestHandlers.push(
      new FixedGasPriceHandler(numberToHexString(networkConfig.gasPrice)),
    );
  }

  if (networkConfig.gas === undefined || networkConfig.gas === "auto") {
    const { AutomaticGasHandler } = await import(
      "./handlers/gas/automatic-gas-handler.js"
    );
    requestHandlers.push(
      new AutomaticGasHandler(
        networkConnection.provider,
        networkConfig.gasMultiplier,
      ),
    );
  } else {
    const { FixedGasHandler } = await import(
      "./handlers/gas/fixed-gas-handler.js"
    );
    requestHandlers.push(
      new FixedGasHandler(numberToHexString(networkConfig.gas)),
    );
  }

  if (networkConfig.from === undefined) {
    const { AutomaticSenderHandler } = await import(
      "./handlers/accounts/automatic-sender-handler.js"
    );
    requestHandlers.push(
      new AutomaticSenderHandler(networkConnection.provider),
    );
  } else {
    const { FixedSenderHandler } = await import(
      "./handlers/accounts/fixed-sender-handler.js"
    );
    requestHandlers.push(
      new FixedSenderHandler(networkConnection.provider, networkConfig.from),
    );
  }

  if (networkConfig.type === "http") {
    const accounts = networkConfig.accounts;

    if (Array.isArray(accounts)) {
      const { LocalAccountsHandler } = await import(
        "./handlers/accounts/local-accounts.js"
      );
      const resolvedAccounts = await Promise.all(
        accounts.map((acc) => acc.getHexString()),
      );

      requestHandlers.push(
        new LocalAccountsHandler(networkConnection.provider, resolvedAccounts),
      );
    } else if (isHttpNetworkHdAccountsConfig(accounts)) {
      const { HDWalletHandler } = await import(
        "./handlers/accounts/hd-wallet-handler.js"
      );
      const hdWalletHandler = await HDWalletHandler.create(
        networkConnection.provider,
        await accounts.mnemonic.get(),
        accounts.path,
        accounts.initialIndex,
        accounts.count,
        await accounts.passphrase.get(),
      );
      requestHandlers.push(hdWalletHandler);
    }
  }

  return requestHandlers;
}
