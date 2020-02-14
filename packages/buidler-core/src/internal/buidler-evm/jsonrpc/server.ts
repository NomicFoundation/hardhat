import debug from "debug";
import http, { Server } from "http";
import { Server as WSServer } from "ws";

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
  private _httpServer: Server;
  private _wsServer: WSServer;

  constructor(config: JsonRpcServerConfig) {
    this._config = config;

    const handler = new JsonRpcHandler(config.provider);

    this._httpServer = http.createServer();
    this._wsServer = new WSServer({
      server: this._httpServer
    });

    this._httpServer.on("request", handler.handleHttp);
    this._wsServer.on("connection", handler.handleWs);
  }

  public getProvider = (name = "json-rpc"): EthereumProvider => {
    const { address, port } = this._httpServer.address();

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
      this._httpServer.listen(this._config.port, this._config.hostname, () => {
        // We get the address and port directly from the server in order to handle random port allocation with `0`.
        const { address, port } = this._httpServer.address();

        console.log(
          `Started HTTP and WebSocket JSON-RPC server at ${address}:${port}/`
        );

        resolve();
      });
    });
  };

  public close = async () => {
    return Promise.all([
      new Promise((resolve, reject) => {
        log("Closing JSON-RPC server");
        this._httpServer.close(err => {
          if (err) {
            log("Failed to close JSON-RPC server");
            reject(err);
            return;
          }

          log("JSON-RPC server closed");
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        log("Closing websocket server");
        this._wsServer.close(err => {
          if (err) {
            log("Failed to close websocket server");
            reject(err);
            return;
          }

          log("Websocket server closed");
          resolve();
        });
      })
    ]);
  };
}
