import chalk from "chalk";
import debug from "debug";
import { IncomingMessage, ServerResponse } from "http";
import getRawBody from "raw-body";
import WebSocket from "ws";

import { EthereumProvider } from "../../../types";
import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
import {
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
      rpcReq = await this._readHttpRequest(req);

      rpcResp = await this._handleRequest(rpcReq);
    } catch (error) {
      rpcResp = await this._handleError(error);
    }

    // Validate the RPC response.
    if (!isValidJsonResponse(rpcResp)) {
      // Malformed response coming from the provider, report to user as an internal error.
      rpcResp = await this._handleError(new InternalError("Internal error"));
    }

    if (rpcReq !== undefined) {
      rpcResp.id = rpcReq.id;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rpcResp));
  };

  public handleWs = async (ws: WebSocket, msg: string) => {
    let rpcReq: JsonRpcRequest | undefined;
    let rpcResp: JsonRpcResponse | undefined;

    try {
      rpcReq = await this._readWsRequest(msg);

      rpcResp = await this._handleRequest(rpcReq);
    } catch (error) {
      rpcResp = await this._handleError(error);
    }

    // Validate the RPC response.
    if (!isValidJsonResponse(rpcResp)) {
      // Malformed response coming from the provider, report to user as an internal error.
      rpcResp = await this._handleError(new InternalError("Internal error"));
    }

    if (rpcReq !== undefined) {
      rpcResp.id = rpcReq.id;
    }

    ws.send(JSON.stringify(rpcResp));
  };

  private _readHttpRequest = async (
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

  private _readWsRequest(msg: string): JsonRpcRequest {
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
  }

  private _handleRequest = async (
    req: JsonRpcRequest
  ): Promise<JsonRpcResponse> => {
    console.log(req.method);

    const result = await this._provider.send(req.method, req.params);

    return {
      jsonrpc: "2.0",
      id: req.id,
      result
    };
  };

  private _handleError = async (error: any): Promise<JsonRpcResponse> => {
    this._printError(error);

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

  private _printError = (error: any) => {
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
      console.error(
        chalk.red(`An unexpected error occurred: ${error.message}`)
      );
    } else {
      console.error(chalk.red("An unexpected error occurred."));
    }

    console.log("");

    console.error(error.stack);
  };
}
