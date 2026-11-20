import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { once } from "node:events";
import { before, describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";
import WebSocket from "ws";

import { HttpProvider } from "../../../../../src/internal/builtin-plugins/network-manager/http-provider.js";
import { JsonRpcServerImplementation } from "../../../../../src/internal/builtin-plugins/node/json-rpc/server.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("JSON-RPC server", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  it("should respond to a request over the network the same as in memory", async function () {
    const hostname = (await exists("/.dockerenv")) ? "0.0.0.0" : "127.0.0.1";

    const connection = await hre.network.create();
    const server = new JsonRpcServerImplementation({
      hostname,
      port: 0,
      provider: connection.provider,
    });

    try {
      const { port } = await server.listen();

      const edrProvider = connection.provider;
      const httpProvider = await HttpProvider.create({
        url: `http://${hostname}:${port}`,
        networkName: connection.networkName,
        timeout: 20_000,
      });

      const httpResponse = await httpProvider.request({
        method: "eth_chainId",
      });
      const edrResponse = await edrProvider.request({
        method: "eth_chainId",
      });

      assert.deepEqual(httpResponse, edrResponse);
    } finally {
      await server.close();
    }
  });

  describe("close", function () {
    for (const { name, clientCount, pauseClients, closeClients } of [
      { name: "no connected clients", clientCount: 0 },
      { name: "multiple connected clients", clientCount: 2 },
      {
        name: "a client that does not respond to the closing handshake",
        clientCount: 1,
        pauseClients: true,
      },
      {
        name: "an already disconnected client",
        clientCount: 1,
        closeClients: true,
      },
    ]) {
      it(`should close with ${name}`, { timeout: 5_000 }, async function (t) {
        const server = await hre.network.createServer({}, "127.0.0.1", 0);
        const { port } = await server.listen();
        const clients: WebSocket[] = [];
        let closing: Promise<void> | null = null;

        t.after(async () => {
          for (const client of clients) {
            client.terminate();
          }
          await (closing ?? server.close());
        });

        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocket(`ws://127.0.0.1:${port}`);
          clients.push(client);
          await once(client, "open", { signal: t.signal });
        }

        if (closeClients === true) {
          for (const client of clients) {
            const closed = once(client, "close", { signal: t.signal });
            client.close();
            await closed;
          }
        }

        if (pauseClients === true) {
          for (const client of clients) {
            // Stop reading frames so the client cannot acknowledge the close.
            client.pause();
          }
        }

        const clientsClosed = clients
          .filter((client) => client.readyState !== WebSocket.CLOSED)
          .map((client) => once(client, "close", { signal: t.signal }));
        const afterClosed = server.afterClosed();
        closing = server.close();
        const serverClosed = Promise.all([closing, afterClosed]).then(() => {
          for (const client of clients) {
            client.resume();
          }
        });
        const [, closeEvents] = await Promise.all([
          serverClosed,
          Promise.all(clientsClosed),
        ]);

        if (pauseClients !== true && closeClients !== true) {
          for (const [code, reason] of closeEvents) {
            assert.equal(code, 1001);
            assert.equal(reason.toString(), "Server shutting down");
          }
        }
      });
    }
  });
});
