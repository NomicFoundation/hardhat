import type {
  EthereumProvider,
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../types/providers.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type WebSocket from "ws";

import {
  InternalError,
  InvalidJsonInputError,
  InvalidRequestError,
} from "../../network-manager/edr/errors.js";
import {
  isJsonRpcRequest,
  isJsonRpcResponse,
  isSuccessfulJsonRpcResponse,
} from "../../network-manager/json-rpc.js";
import { ProviderError } from "../../network-manager/provider-errors.js";

export class JsonRpcHandler {
  readonly #provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
  }

  public handleHttp = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    this.#setCorsHeaders(res);
    if (req.method === "OPTIONS") {
      this.#sendEmptyResponse(res);
      return;
    }

    let jsonHttpRequest: any;
    try {
      jsonHttpRequest = await _readJsonHttpRequest(req);
    } catch (error) {
      this.#sendResponse(res, _handleError(error));
      return;
    }

    // NOTE: EthereumProvider currently doesn't support batch requests. Thus,
    // the following code block could be safely removed.
    if (Array.isArray(jsonHttpRequest)) {
      const responses = await Promise.all(
        jsonHttpRequest.map((singleReq: any) => this.#handleRequest(singleReq)),
      );

      this.#sendResponse(res, responses);
      return;
    }

    const rpcResp = await this.#handleRequest(jsonHttpRequest);

    this.#sendResponse(res, rpcResp);
  };

  public handleWs = async (ws: WebSocket): Promise<void> => {
    const subscriptions: string[] = [];
    let isClosed = false;

    const listener = (payload: { subscription: string; result: any }) => {
      // Don't attempt to send a message to the websocket if we already know it is closed,
      // or the current websocket connection isn't interested in the particular subscription.
      if (isClosed || !subscriptions.includes(payload.subscription)) {
        return;
      }

      try {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_subscription",
            params: payload,
          }),
        );
      } catch (error) {
        _handleError(error);
      }
    };

    // Handle eth_subscribe notifications.
    this.#provider.addListener("notification", listener);

    ws.on("message", async (msg: string) => {
      let rpcReq: JsonRpcRequest | JsonRpcRequest[];
      let rpcResp: JsonRpcResponse | JsonRpcResponse[];

      try {
        rpcReq = _readWsRequest(msg);

        rpcResp = Array.isArray(rpcReq)
          ? await Promise.all(
              rpcReq.map((req) => this.#handleWsRequest(req, subscriptions)),
            )
          : await this.#handleWsRequest(rpcReq, subscriptions);
      } catch (error) {
        rpcResp = _handleError(error);
      }

      ws.send(JSON.stringify(rpcResp));
    });

    ws.on("close", () => {
      // Remove eth_subscribe listener.
      this.#provider.removeListener("notification", listener);

      // Clear any active subscriptions for the closed websocket connection.
      isClosed = true;
      subscriptions.forEach(async (subscriptionId) => {
        await this.#provider.request({
          method: "eth_unsubscribe",
          params: [subscriptionId],
        });
      });
    });
  };

  #sendEmptyResponse(res: ServerResponse) {
    res.writeHead(200);
    res.end();
  }

  #setCorsHeaders(res: ServerResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
    res.setHeader("Access-Control-Allow-Headers", "*");
  }

  #sendResponse(
    res: ServerResponse,
    rpcResp: JsonRpcResponse | JsonRpcResponse[],
  ) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rpcResp));
  }

  async #handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!isJsonRpcRequest(req)) {
      return _handleError(new InvalidRequestError("Invalid request"));
    }

    const rpcReq: JsonRpcRequest = req;
    let rpcResp: JsonRpcResponse | undefined;

    try {
      const result = await this.#provider.request({
        method: req.method,
        params: req.params,
      });

      rpcResp = {
        jsonrpc: "2.0",
        id: req.id,
        result,
      };
    } catch (error) {
      rpcResp = _handleError(error);
    }

    // Validate the RPC response.
    if (!isJsonRpcResponse(rpcResp)) {
      // Malformed response coming from the provider, report to user as an internal error.
      rpcResp = _handleError(new InternalError("Internal error"));
    }

    rpcResp.id = rpcReq.id !== undefined ? rpcReq.id : null;

    return rpcResp;
  }

  async #handleWsRequest(rpcReq: JsonRpcRequest, subscriptions: string[]) {
    const rpcResp = await this.#handleRequest(rpcReq);

    // If eth_subscribe was successful, keep track of the subscription id,
    // so we can cleanup on websocket close.
    if (
      rpcReq.method === "eth_subscribe" &&
      isSuccessfulJsonRpcResponse(rpcResp) &&
      typeof rpcResp.result === "string"
    ) {
      subscriptions.push(rpcResp.result);
    }

    return rpcResp;
  }
}

const _readJsonHttpRequest = async (req: IncomingMessage): Promise<any> => {
  let json;

  try {
    const bytes: number[] = [];
    for await (const chunk of req) {
      bytes.push(...chunk);
    }
    const text = new TextDecoder("utf-8").decode(new Uint8Array(bytes));

    json = JSON.parse(text);
  } catch (error) {
    if (error instanceof Error) {
      // eslint-disable-next-line no-restricted-syntax -- Malformed JSON-RPC request received, report to user as a json input error.
      throw new InvalidJsonInputError(`Parse error: ${error.message}`);
    }

    throw error;
  }

  return json;
};

const _readWsRequest = (msg: string): JsonRpcRequest | JsonRpcRequest[] => {
  let json: any;
  try {
    json = JSON.parse(msg);
  } catch (error) {
    if (error instanceof Error) {
      // eslint-disable-next-line no-restricted-syntax -- Malformed JSON-RPC request received, report to user as a json input error.
      throw new InvalidJsonInputError(`Parse error: ${error.message}`);
    }
    throw error;
  }

  return json;
};

const _handleError = (error: any): JsonRpcResponse => {
  // extract the relevant fields from the error before wrapping it
  let txHash: string | undefined;
  let returnData: string | undefined;

  if (error.transactionHash !== undefined) {
    txHash = error.transactionHash;
  }
  if (error.data !== undefined) {
    if (error.data.data !== undefined) {
      returnData = error.data.data;
    } else {
      returnData = error.data;
    }

    if (txHash === undefined && error.data.transactionHash !== undefined) {
      txHash = error.data.transactionHash;
    }
  }

  // In case of non-hardhat error, treat it as internal and associate the appropriate error code.
  if (!ProviderError.isProviderError(error)) {
    error = new InternalError(error);
  }

  const response: FailedJsonRpcResponse = {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  const data: any = {
    message: error.message,
  };

  if (txHash !== undefined) {
    data.txHash = txHash;
  }

  if (returnData !== undefined) {
    data.data = returnData;
  }

  response.error.data = data;

  return response;
};
