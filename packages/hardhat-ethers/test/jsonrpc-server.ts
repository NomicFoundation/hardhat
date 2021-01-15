import { assert } from "chai";
import {
  TASK_COMPILE,
  TASK_NODE_CREATE_SERVER,
  TASK_NODE_GET_PROVIDER,
  TASK_TEST,
} from "hardhat/builtin-tasks/task-names";
import { EthereumProvider, JsonRpcServer } from "hardhat/types";

import { delay, useEnvironment } from "./helpers";

describe("JsonRpcServer integration tests", function () {
  describe("Using a websocket connection", function () {
    useEnvironment("jsonrpc-node");

    let server: JsonRpcServer;
    let serverURL: string;

    beforeEach(async function () {
      await this.env.run(TASK_COMPILE, { quiet: true });

      const provider: EthereumProvider = await this.env.run(
        TASK_NODE_GET_PROVIDER,
        {}
      );
      const hostname = "localhost";

      server = await this.env.run(TASK_NODE_CREATE_SERVER, {
        hostname,
        port: 0,
        provider,
      });

      const { port, address } = await server.listen();
      serverURL = `ws://${address}:${port}`;

      return provider.request({
        method: "hardhat_setLoggingEnabled",
        params: [false],
      });
    });

    afterEach(async function () {
      return server.close();
    });

    describe("Event subscriptions", function () {
      it("Should receive all three events", async function () {
        const { ethers, artifacts } = this.env;

        const provider = new ethers.providers.WebSocketProvider(serverURL);
        const account = provider.getSigner(0);

        const eventFactory = await this.env.ethers.getContractFactory(
          "EventTest",
          account
        );
        const eventContract = await eventFactory.deploy(30);
        const filter = eventContract.filters.NumberSet();

        const events: any[] = [];

        provider.on(filter, (event) => events.push(event));

        await eventContract.functions.setTheNumber(30);
        await eventContract.functions.setTheNumber(50);
        await eventContract.functions.setTheNumber(70);

        // ether.js has its own implementation of an `EventEmitter` API that introduces events into the event loop.
        // This means that sometimes the last event is fired after this test finishes unless we wait here.
        await delay();

        assert.lengthOf(events, 3);
      });
    });
  });
});
