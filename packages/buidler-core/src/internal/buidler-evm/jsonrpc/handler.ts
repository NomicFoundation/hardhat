import chalk from "chalk";
import debug from "debug";
import { IncomingMessage, ServerResponse } from "http";
import getRawBody from "raw-body";

import { EthereumProvider } from "../../../types";
import { BUIDLER_NAME } from "../../constants";
import { BuidlerError } from "../../core/errors";
import { ERRORS, getErrorCode } from "../../core/errors-list";
import {
  isValidJsonRequest,
  isValidJsonResponse,
  JsonRpcRequest,
  JsonRpcResponse
} from "../../core/providers/http";
import {
  BuidlerEVMProviderError,
  InternalError,
  InvalidJsonInputError,
  InvalidRequestError
} from "../provider/errors";

const log = debug("buidler:core:buidler-evm:jsonrpc");

export default class JsonRpcHandler {
  private _ethereum: EthereumProvider;

  constructor(ethereum: EthereumProvider) {
    this._ethereum = ethereum;
  }

  public requestListener = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    let rpcReq: JsonRpcRequest | undefined;
    let rpcResp: JsonRpcResponse | undefined;

    try {
      rpcReq = await this._readRequest(req);

      rpcResp = await this._handleRequest(rpcReq);
    } catch (error) {
      rpcResp = await this._handleError(error);
    }

    if (rpcReq !== undefined) {
      rpcResp.id = rpcReq.id;
    }

    // Validate the RPC response.
    if (!isValidJsonResponse(rpcResp)) {
      rpcResp = await this._handleError(new InternalError("Internal error"));
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rpcResp));
  };

  private _readRequest = async (
    req: IncomingMessage
  ): Promise<JsonRpcRequest> => {
    const buf = await getRawBody(req);
    const text = buf.toString();
    let json;

    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new InvalidJsonInputError(`Parse error: ${error.message}`);
    }

    if (!isValidJsonRequest(json)) {
      throw new InvalidRequestError("Invalid request");
    }

    return json;
  };

  private _handleRequest = async (
    req: JsonRpcRequest
  ): Promise<JsonRpcResponse> => {
    console.log(req.method);

    const result = await this._ethereum.send(req.method, req.params);

    return {
      jsonrpc: "2.0",
      id: req.id,
      result
    };
  };

  private _handleError = async (error: any): Promise<JsonRpcResponse> => {
    this._printError(error);

    const rpcResp: JsonRpcResponse = {
      jsonrpc: "2.0",
      error: {
        code: error.code,
        message: error.message
      }
    };

    if (!(error instanceof BuidlerEVMProviderError)) {
      rpcResp.error = new InternalError("Internal error");
    }

    return rpcResp;
  };

  private _printError = (error: any) => {
    let showStackTraces = process.argv.includes("--show-stack-traces");
    let isBuidlerError = false;

    if (error instanceof BuidlerEVMProviderError) {
      const wrappedError = new BuidlerError(
        ERRORS.BUILTIN_TASKS.JSONRPC_HANDLER_ERROR,
        {
          error: error.message
        },
        error
      );

      console.error(chalk.red(`Error ${wrappedError.message}`));
    } else if (BuidlerError.isBuidlerError(error)) {
      isBuidlerError = true;
      console.error(chalk.red(`Error ${error.message}`));
    } else if (error instanceof Error) {
      console.error(
        chalk.red(`An unexpected error occurred: ${error.message}`)
      );
      showStackTraces = true;
    } else {
      console.error(chalk.red("An unexpected error occurred."));
      showStackTraces = true;
    }

    console.log("");

    if (showStackTraces) {
      console.error(error.stack);
    } else {
      if (!isBuidlerError) {
        console.error(
          `If you think this is a bug in Buidler, please report it here: https://buidler.dev/reportbug`
        );
      }

      if (BuidlerError.isBuidlerError(error)) {
        const link = `https://buidler.dev/${getErrorCode(
          error.errorDescriptor
        )}`;

        console.error(
          `For more info go to ${link} or run ${BUIDLER_NAME} with --show-stack-traces`
        );
      } else {
        console.error(
          `For more info run ${BUIDLER_NAME} with --show-stack-traces`
        );
      }
    }
  };
}
