import { assert } from "chai";
import {
  TASK_COMPILE,
  TASK_NODE_CREATE_SERVER,
  TASK_NODE_GET_PROVIDER,
  TASK_TEST,
} from "hardhat/builtin-tasks/task-names";
import { EthereumProvider, JsonRpcServer } from "hardhat/types";

import { useEnvironment } from "./helpers";

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
        const { Web3, artifacts } = this.env;

        const web3 = new Web3(new Web3.providers.WebsocketProvider(serverURL));
        const [account] = await web3.eth.getAccounts();

        const { abi: eventABI, bytecode } = await artifacts.readArtifact(
          "EventTest"
        );

        const eventFactory = new web3.eth.Contract(eventABI, undefined, {
          from: account,
        });

        const eventContractWeb3 = await eventFactory
          .deploy({
            data: bytecode,
            arguments: [30],
          })
          .send({ from: account });

        const events: any[] = [];
        const errors: any[] = [];

        eventContractWeb3.events
          .NumberSet()
          .on("data", (event: any) => events.push(event))
          .on("error", (error: any) => errors.push(error));

        await eventContractWeb3.methods.setTheNumber(50).send();
        await eventContractWeb3.methods.setTheNumber(30).send();
        await eventContractWeb3.methods.setTheNumber(70).send();

        assert.lengthOf(events, 3);
        assert.lengthOf(errors, 0);
      });
    });
  });
});
