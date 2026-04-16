import type { LedgerHandler as LedgerHandlerT } from "../handler.js";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { JsonRpcRequest, JsonRpcResponse } from "hardhat/types/providers";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { isFailedJsonRpcResponse, isJsonRpcResponse } from "../rpc-helpers.js";

// The ledger packages have been problematic in the past, leading to errors
// and slowdowns, even when not being used, so we lazy load them now.
let LedgerHandler: typeof LedgerHandlerT | undefined;

export default async (): Promise<Partial<NetworkHooks>> => {
  // This map is essential for managing multiple network connections in Hardhat V3.
  // Since Hardhat V3 supports multiple connections, we use this map to track each one
  // and associate it with the corresponding handlers array.
  // When a connection is closed, its associated handler is removed from the map.
  // See the "closeConnection" function at the end of the file for more details.
  const ledgerHandlerPerConnection: WeakMap<
    NetworkConnection<ChainType | string>,
    LedgerHandlerT
  > = new WeakMap();

  const initializationMutex = new AsyncMutex();

  const handlers: Partial<NetworkHooks> = {
    async onRequest<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      jsonRpcRequest: JsonRpcRequest,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
        nextJsonRpcRequest: JsonRpcRequest,
      ) => Promise<JsonRpcResponse>,
    ) {
      if (
        jsonRpcRequest.method === "eth_chainId" ||
        jsonRpcRequest.method === "eth_getTransactionCount" ||
        jsonRpcRequest.method === "eth_sendRawTransaction"
      ) {
        // Allow these methods to pass through untouched.
        // The ledger handler calls them directly, so intercepting them here would lead to infinite recursion.
        return next(context, networkConnection, jsonRpcRequest);
      }

      if (LedgerHandler === undefined) {
        const handlerModule = await import("../handler.js");
        LedgerHandler = handlerModule.LedgerHandler;
      }

      const ledgerHandler = await initializationMutex.exclusiveRun(async () => {
        let handlerPerConnection =
          ledgerHandlerPerConnection.get(networkConnection);

        if (handlerPerConnection === undefined) {
          assertHardhatInvariant(
            LedgerHandler !== undefined,
            "LedgerHandler should have been imported",
          );

          handlerPerConnection = new LedgerHandler(
            networkConnection.provider,
            {
              accounts: networkConnection.networkConfig.ledgerAccounts,
              derivationFunction:
                networkConnection.networkConfig.ledgerOptions
                  ?.derivationFunction,
            },
            context.interruptions.displayMessage.bind(context.interruptions),
          );

          ledgerHandlerPerConnection.set(
            networkConnection,
            handlerPerConnection,
          );
        }

        return handlerPerConnection;
      });

      if (jsonRpcRequest.method === "eth_accounts") {
        const accountsResponse = await next(
          context,
          networkConnection,
          jsonRpcRequest,
        );

        if (isFailedJsonRpcResponse(accountsResponse)) {
          // If the RPC node doesn't support eth_accounts,
          // return only the Ledger accounts instead of propagating the error.
          return {
            jsonrpc: "2.0",
            id: jsonRpcRequest.id,
            result: [...ledgerHandler.getLedgerAccounts()],
          };
        }

        assertHardhatInvariant(
          Array.isArray(accountsResponse.result) &&
            accountsResponse.result.every((v) => typeof v === "string"),
          "accountsResponse.result should be an array and every element should be a string",
        );

        accountsResponse.result = [
          ...accountsResponse.result,
          ...ledgerHandler.getLedgerAccounts(),
        ];

        return accountsResponse;
      }

      const newRequestOrResponse = await ledgerHandler.handle(jsonRpcRequest);

      if (isJsonRpcResponse(newRequestOrResponse)) {
        return newRequestOrResponse;
      }

      return next(context, networkConnection, newRequestOrResponse);
    },

    async closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void> {
      if (ledgerHandlerPerConnection.has(networkConnection) === true) {
        ledgerHandlerPerConnection.delete(networkConnection);
      }

      return next(context, networkConnection);
    },
  };

  return handlers;
};
