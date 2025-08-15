import type { JsonRpcServer } from "../../../../types/network.js";
import type { EthereumProvider } from "../../../../types/providers.js";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import http from "node:http";

import debug from "debug";
import { WebSocketServer } from "ws";

import { JsonRpcHandler } from "./handler.js";

const log = debug("hardhat:core:tasks:node:json-rpc:server");

export interface JsonRpcServerConfig {
  hostname: string;
  port?: number;
  provider: EthereumProvider;
}

export class JsonRpcServerImplementation implements JsonRpcServer {
  readonly #config: JsonRpcServerConfig;
  readonly #httpServer: Server;
  readonly #wsServer: WebSocketServer;

  constructor(config: JsonRpcServerConfig) {
    this.#config = config;

    const handler = new JsonRpcHandler(config.provider);

    this.#httpServer = http.createServer();
    this.#wsServer = new WebSocketServer({
      server: this.#httpServer,
    });

    this.#httpServer.on("request", handler.handleHttp);
    this.#wsServer.on("connection", handler.handleWs);
  }

  public listen = (): Promise<{ address: string; port: number }> => {
    return new Promise((resolve) => {
      log(`Starting JSON-RPC server on port ${this.#config.port}`);
      this.#httpServer.listen(this.#config.port, this.#config.hostname, () => {
        // We get the address and port directly from the server in order to handle random port allocation with `0`.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TCP sockets return AddressInfo
        const address = this.#httpServer.address() as AddressInfo;
        resolve(address);
      });
    });
  };

  public waitUntilClosed = async (): Promise<void> => {
    const httpServerClosed = new Promise((resolve) => {
      this.#httpServer.once("close", resolve);
    });

    const wsServerClosed = new Promise((resolve) => {
      this.#wsServer.once("close", resolve);
    });

    await Promise.all([httpServerClosed, wsServerClosed]);
  };

  public close = async (): Promise<void> => {
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        log("Closing JSON-RPC server");
        this.#httpServer.close((err) => {
          if (err !== null && err !== undefined) {
            log("Failed to close JSON-RPC server");
            reject(err);
            return;
          }

          log("JSON-RPC server closed");
          resolve();
        });
      }),
      new Promise<void>((resolve, reject) => {
        log("Closing websocket server");
        this.#wsServer.close((err) => {
          if (err !== null && err !== undefined) {
            log("Failed to close websocket server");
            reject(err);
            return;
          }

          log("Websocket server closed");
          resolve();
        });
      }),
    ]);
  };
}
