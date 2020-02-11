import debug from "debug";
import http, { Server } from "http";

import { EthereumProvider } from "../../../types";
import { HttpProvider } from "../../core/providers/http";

import JsonRpcHandler from "./handler";

const log = debug("buidler:core:buidler-evm:jsonrpc");

export interface JsonRpcServerConfig {
  hostname: string;
  port: number;

  provider: EthereumProvider;
}

export class JsonRpcServer {
  private _config: JsonRpcServerConfig;
  private _server: Server;

  constructor(config: JsonRpcServerConfig) {
    this._config = config;

    const handler = new JsonRpcHandler(config.provider);

    this._server = http.createServer(handler.requestListener);
  }

  public getProvider = (name = "json-rpc"): EthereumProvider => {
    const { address, port } = this._server.address();

    return new HttpProvider(`http://${address}:${port}/`, name);
  };

  public listen = (): Promise<number> => {
    return new Promise<number>(async resolve => {
      process.once("SIGINT", async () => {
        await this.close();

        resolve(0);
      });

      await this.start();
    });
  };

  public start = async () => {
    return new Promise(resolve => {
      log(`Starting JSON-RPC server on port ${this._config.port}`);
      this._server.listen(this._config.port, this._config.hostname, () => {
        // We get the address and port directly from the server in order to handle random port allocation with `0`.
        const { address, port } = this._server.address();

        console.log(`Started JSON-RPC server at http://${address}:${port}/`);

        resolve();
      });
    });
  };

  public close = async () => {
    return new Promise(resolve => {
      this._server.on("close", () => {
        log("JSON-RPC server closed");

        resolve();
      });

      log("Closing JSON-RPC server");
      this._server.close();
    });
  };
}
