import chalk from "chalk";
import debug from "debug";
import http, { IncomingMessage, ServerResponse } from "http";
import getRawBody from "raw-body";

import { BUIDLER_NAME, BUIDLEREVM_NETWORK_NAME } from "../internal/constants";
import { task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS, getErrorCode } from "../internal/core/errors-list";
import { createProvider } from "../internal/core/providers/construction";
import {
  isValidJsonRequest,
  JsonRpcRequest,
  JsonRpcResponse
} from "../internal/core/providers/http";
import { lazyObject } from "../internal/util/lazy";
import { EthereumProvider } from "../types";

import { TASK_JSONRPC } from "./task-names";

const log = debug("buidler:core:tasks:jsonrpc");

interface ServerConfig {
  hostname: string;
  port: number;
}

class Server {
  private _config: ServerConfig;
  private _ethereum: EthereumProvider;

  constructor(config: ServerConfig, ethereum: EthereumProvider) {
    this._ethereum = ethereum;
    this._config = config;
  }

  public listen = (): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      const server = http.createServer(this._httpHandler);

      server.listen(this._config.port, this._config.hostname, () => {
        console.log(
          `Server running at http://${this._config.hostname}:${this._config.port}/`
        );
      });

      process.once("SIGINT", async () => {
        log(`Stopping JSON-RPC server`);

        resolve(0);
      });

      process.once("uncaughtException", reject);
    });
  };

  private _httpHandler = async (req: IncomingMessage, res: ServerResponse) => {
    let rpcReq: JsonRpcRequest | undefined;
    try {
      rpcReq = await this._readRequest(req);

      console.log(rpcReq.method);

      const result = await this._ethereum.send(rpcReq.method, rpcReq.params);

      const rpcResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: rpcReq.id,
        result
      };

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(rpcResp));
    } catch (error) {
      this._handleError(error);

      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");

      if (rpcReq === undefined) {
        res.end(JSON.stringify(error.message));
        return;
      }

      const rpcResp: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: rpcReq.id,
        error: {
          code: -1,
          message: error.message
        }
      };

      res.end(JSON.stringify(rpcResp));
    }
  };

  private _readRequest = (req: IncomingMessage): Promise<JsonRpcRequest> => {
    return getRawBody(req).then(
      (buf): JsonRpcRequest => {
        const text = buf.toString();
        const json = JSON.parse(text);

        if (!isValidJsonRequest(json)) {
          throw new Error(`Invalid JSON-RPC request: ${text}`);
        }

        return json;
      }
    );
  };

  private _handleError = (error: any) => {
    let showStackTraces = process.argv.includes("--show-stack-traces");
    let isBuidlerError = false;

    if (BuidlerError.isBuidlerError(error)) {
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

export default function() {
  task(TASK_JSONRPC, "Starts a buidler JSON-RPC server").setAction(
    async (_, { config }) => {
      const hostname = "localhost";
      const port = 8545;

      log(`Starting JSON-RPC server on port ${port}`);

      try {
        log("Creating BuidlerRuntimeEnvironment");

        const networkName = BUIDLEREVM_NETWORK_NAME;
        const networkConfig = config.networks[networkName];

        const ethereum = lazyObject(() => {
          log(`Creating buidlerevm provider for JSON-RPC sever`);
          return createProvider(
            networkName,
            networkConfig,
            config.solc.version,
            config.paths
          );
        });

        const srv = new Server({ hostname, port }, ethereum);

        process.exitCode = await srv.listen();
      } catch (error) {
        if (BuidlerError.isBuidlerError(error)) {
          throw error;
        }

        throw new BuidlerError(
          ERRORS.BUILTIN_TASKS.JSONRPC_SERVER_ERROR,
          {
            error: error.message
          },
          error
        );
      }
    }
  );
}
