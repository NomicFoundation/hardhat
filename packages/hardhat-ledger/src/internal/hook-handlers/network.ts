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

// Ledger packages are slow to load and are not always needed.
let LedgerHandler: typeof LedgerHandlerT | undefined;

export default async (): Promise<Partial<NetworkHooks>> => {
  // Each network connection owns its Ledger handler.
  const ledgerHandlerPerConnection: WeakMap<
    NetworkConnection<ChainType | string>,
    LedgerHandlerT
  > = new WeakMap();

  // Connections whose `closeConnection` has already run.
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
      // Avoid loading the handler when this network has no Ledger accounts.
      if (networkConnection.networkConfig.ledgerAccounts.length === 0) {
        return await next(context, networkConnection, jsonRpcRequest);
      }

      if (
        jsonRpcRequest.method === "eth_chainId" ||
        jsonRpcRequest.method === "eth_getTransactionCount" ||
        jsonRpcRequest.method === "eth_sendRawTransaction"
      ) {
        // The handler sends these requests directly. Intercepting them recurses.
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
        // The connection closed while this request was starting. A new device
        // session would have no owner to close it.
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
          // Fall back to Ledger accounts if the node lacks `eth_accounts`.
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
        await ledgerHandler.close();
        ledgerHandlerPerConnection.delete(networkConnection);
      }

      return await next(context, networkConnection);
    },
  };

  return handlers;
};
