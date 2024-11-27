import type { RequestHandler } from "./types.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../types/network.js";

import { ChainIdValidatorHandler } from "./handlers/chain-id/handler.js";

// TODO: finish docs
/**
 *
 * This function returns an handlers array based on the values in the networkConfig and....
 * The order of the handlers, if all are present, is: chain handler, gas handler and accounts handler.
 * The order is important to get a correct result when the handler are executed
 */
export function createHandlersArray<ChainTypeT extends ChainType | string>(
  networkConnection: NetworkConnection<ChainTypeT>,
): RequestHandler[] {
  const requestHandlers = [];

  if (networkConnection.networkConfig.type === "http") {
    if (networkConnection.networkConfig.chainId !== undefined) {
      requestHandlers.push(
        new ChainIdValidatorHandler(
          networkConnection.provider,
          networkConnection.networkConfig.chainId,
        ),
      );
    }
  }

  return requestHandlers;
}
