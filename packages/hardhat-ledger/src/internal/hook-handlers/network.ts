import type { LedgerHandler as LedgerHandlerT } from "../handler.js";
import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { JsonRpcRequest, JsonRpcResponse } from "hardhat/types/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

import { LedgerConnectionClosedError } from "../dmk-errors.js";
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

  // Connections whose `closeConnection` has already run. A request that was
  // still loading the handler when that happened must not build a new one: it
  // would open a device session for a connection that is going away, and
  // nothing would ever close it.
  const closedConnections: WeakSet<NetworkConnection<ChainType | string>> =
    new WeakSet();

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
      // Skip the entire hook handler if there are no ledger accounts.
      // This avoids having to load the implementation of the handler unless
      // it's actually needed.
      if (networkConnection.networkConfig.ledgerAccounts.length === 0) {
        return await next(context, networkConnection, jsonRpcRequest);
      }

      if (
        jsonRpcRequest.method === "eth_chainId" ||
        jsonRpcRequest.method === "eth_getTransactionCount" ||
        jsonRpcRequest.method === "eth_sendRawTransaction"
      ) {
        // Allow these methods to pass through untouched.
        // The ledger handler calls them directly, so intercepting them here would lead to infinite recursion.
        return await next(context, networkConnection, jsonRpcRequest);
      }

      if (LedgerHandler === undefined) {
        const handlerModule = await import("../handler.js");
        LedgerHandler = handlerModule.LedgerHandler;
      }

      const ledgerHandler = await initializationMutex.exclusiveRun(async () => {
        let handlerPerConnection =
          ledgerHandlerPerConnection.get(networkConnection);

        if (handlerPerConnection === undefined) {
          if (closedConnections.has(networkConnection)) {
            return undefined;
          }

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

      if (ledgerHandler === undefined) {
        // The connection was closed while this request was starting. Serving it
        // would open a device session nothing will ever close, and forwarding
        // it would silently drop the Ledger accounts from `eth_accounts` or
        // send a transaction the Ledger never signed.
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
          { error: new LedgerConnectionClosedError(), transportId: "" },
        );
      }

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

      return await next(context, networkConnection, newRequestOrResponse);
    },

    async closeConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      networkConnection: NetworkConnection<ChainTypeT>,
      next: (
        nextContext: HookContext,
        nextNetworkConnection: NetworkConnection<ChainTypeT>,
      ) => Promise<void>,
    ): Promise<void> {
      closedConnections.add(networkConnection);

      const ledgerHandler = ledgerHandlerPerConnection.get(networkConnection);

      if (ledgerHandler !== undefined) {
        // The Device Management Kit keeps USB hotplug listeners registered for
        // the lifetime of the process, so the connection has to be torn down
        // explicitly or Hardhat never exits.
        await ledgerHandler.close();

        // Dropped only once it is closed. A request arriving while we await
        // would otherwise find no handler, build a fresh one, and open a device
        // session on a connection that is already going away.
        ledgerHandlerPerConnection.delete(networkConnection);
      }

      return await next(context, networkConnection);
    },
  };

  return handlers;
};
