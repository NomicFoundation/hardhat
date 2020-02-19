import chalk from "chalk";
import debug from "debug";
import { IncomingMessage, ServerResponse } from "http";
import getRawBody from "raw-body";
import WebSocket from "ws";

import { EthereumProvider } from "../../../types";
import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
import {
  isSuccessfulJsonResponse,
  isValidJsonRequest,
  isValidJsonResponse,
  JsonRpcRequest,
  JsonRpcResponse
} from "../../util/jsonrpc";
import {
  BuidlerEVMProviderError,
  InternalError,
  InvalidJsonInputError,
  InvalidRequestError
} from "../provider/errors";

// tslint:disable only-buidler-error

const log = debug("buidler:core:buidler-evm:jsonrpc");

export default class JsonRpcHandler {
  private _provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this._provider = provider;
  }

  public handleHttp = async (req: IncomingMessage, res: ServerResponse) => {
    let rpcReq: JsonRpcRequest | undefined;
    let rpcResp: JsonRpcResponse | undefined;

    try {
      rpcReq = await _readHttpRequest(req);

      rpcResp = await this._handleRequest(rpcReq);
    } catch (error) {
      rpcResp = _handleError(error);
    }

    // Validate the RPC response.
    if (!isValidJsonResponse(rpcResp)) {
      // Malformed response coming from the provider, report to user as an internal error.
      rpcResp = _handleError(new InternalError("Internal error"));
    }

    if (rpcReq !== undefined) {
      rpcResp.id = rpcReq.id;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rpcResp));
  };

  public handleWs = async (ws: WebSocket) => {
    const subscriptions: string[] = [];
    let isClosed = false;

    const listener = (payload: { subscription: string; result: any }) => {
      // Don't attempt to send a message to the websocket if we already know it is closed,
      // or the current websocket connection isn't interested in the particular subscription.
      if (isClosed || subscriptions.includes(payload.subscription)) {
        return;
      }

      try {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_subscribe",
            params: payload
          })
        );
      } catch (error) {
        _handleError(error);
      }
    };

    // Handle eth_subscribe notifications.
    this._provider.addListener("notification", listener);

    ws.on("message", async msg => {
      let rpcReq: JsonRpcRequest | undefined;
      let rpcResp: JsonRpcResponse | undefined;

      try {
        rpcReq = _readWsRequest(msg as string);

        rpcResp = await this._handleRequest(rpcReq);

        // If eth_subscribe was successful, keep track of the subscription id,
        // so we can cleanup on websocket close.
        if (
          rpcReq.method === "eth_subscribe" &&
          isSuccessfulJsonResponse(rpcResp)
        ) {
          subscriptions.push(rpcResp.result.id);
        }
      } catch (error) {
        rpcResp = _handleError(error);
      }

      // Validate the RPC response.
      if (!isValidJsonResponse(rpcResp)) {
        // Malformed response coming from the provider, report to user as an internal error.
        rpcResp = _handleError(new InternalError("Internal error"));
      }

      if (rpcReq !== undefined) {
        rpcResp.id = rpcReq.id;
      }

      ws.send(JSON.stringify(rpcResp));
    });

    ws.on("close", () => {
      // Remove eth_subscribe listener.
      this._provider.removeListener("notification", listener);

      // Clear any active subscriptions for the closed websocket connection.
      isClosed = true;
      subscriptions.forEach(async subscriptionId => {
        await this._provider.send("eth_unsubscribe", [subscriptionId]);
      });
    });
  };

  private _handleRequest = async (
    req: JsonRpcRequest
  ): Promise<JsonRpcResponse> => {
    // console.log(req.method);

    const result = await this._provider.send(req.method, req.params);

    return {
      jsonrpc: "2.0",
      id: req.id,
      result
    };
  };
}

const _readHttpRequest = async (
  req: IncomingMessage
): Promise<JsonRpcRequest> => {
  let json;

  try {
    const buf = await getRawBody(req);
    const text = buf.toString();

    json = JSON.parse(text);
  } catch (error) {
    throw new InvalidJsonInputError(`Parse error: ${error.message}`);
  }

  if (!isValidJsonRequest(json)) {
    throw new InvalidRequestError("Invalid request");
  }

  return json;
};

const _readWsRequest = (msg: string): JsonRpcRequest => {
  let json: any;
  try {
    json = JSON.parse(msg);
  } catch (error) {
    throw new InvalidJsonInputError(`Parse error: ${error.message}`);
  }

  if (!isValidJsonRequest(json)) {
    throw new InvalidRequestError("Invalid request");
  }

  return json;
};

const _handleError = (error: any): JsonRpcResponse => {
  _printError(error);

  // In case of non-buidler error, treat it as internal and associate the appropriate error code.
  if (!BuidlerEVMProviderError.isBuidlerEVMProviderError(error)) {
    error = new InternalError(error.message);
  }

  return {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: error.code,
      message: error.message
    }
  };
};

const _printError = (error: any) => {
  return;
  if (BuidlerEVMProviderError.isBuidlerEVMProviderError(error)) {
    // Report the error to console in the format of other BuidlerErrors (wrappedError.message),
    // while preserving the stack from the originating error (error.stack).
    const wrappedError = new BuidlerError(
      ERRORS.BUILTIN_TASKS.JSONRPC_HANDLER_ERROR,
      {
        error: error.message
      },
      error
    );

    console.error(chalk.red(`Error ${wrappedError.message}`));
  } else if (BuidlerError.isBuidlerError(error)) {
    console.error(chalk.red(`Error ${error.message}`));
  } else if (error instanceof Error) {
    console.error(chalk.red(`An unexpected error occurred: ${error.message}`));
  } else {
    console.error(chalk.red("An unexpected error occurred."));
  }

  console.log("");

  console.error(error.stack);
};
