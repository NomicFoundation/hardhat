import debug from "debug";
import * as http from "http";

import { EthereumProvider } from "../../../types";

import JsonRpcHandler from "./handler";

const log = debug("buidler:core:buidler-evm:jsonrpc");

export interface JsonRpcServerConfig {
  hostname: string;
  port: number;

  provider: EthereumProvider;
}

export class JsonRpcServer {
  private _config: JsonRpcServerConfig;

  constructor(config: JsonRpcServerConfig) {
    this._config = config;
  }

  public listen = (): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      const { hostname, port, provider } = this._config;

      log(`Starting JSON-RPC server on port ${port}`);

      const handler = new JsonRpcHandler(provider);
      const server = http.createServer(handler.requestListener);

      process.once("SIGINT", async () => {
        log(`Stopping JSON-RPC server`);

        resolve(0);
      });

      process.once("uncaughtException", reject);

      server.listen(port, hostname, () => {
        console.log(`Started JSON-RPC server at http://${hostname}:${port}/`);
      });
    });
  };
}
