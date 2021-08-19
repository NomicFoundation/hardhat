import { assert } from "chai";
import { zeroAddress } from "ethereumjs-util";
import { ethers } from "ethers";
import WebSocket from "ws";

import { numberToRpcQuantity } from "../../../../../../../internal/core/jsonrpc/types/base-types";
import {
  EthereumProvider,
  EthSubscription,
  ProviderMessage,
} from "../../../../../../../types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { sleep } from "../../../../helpers/sleep";
import { deployContract } from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_subscribe (in-process)", function () {
        if (name === "JSON-RPC") {
          return;
        }

        function createFilterResultsGetter(
          ethereumProvider: EthereumProvider,
          filter: string
        ) {
          const notificationsResults: any[] = [];
          const notificationsListener = (payload: {
            subscription: string;
            result: any;
          }) => {
            if (filter === payload.subscription) {
              notificationsResults.push(payload.result);
            }
          };

          ethereumProvider.addListener("notification", notificationsListener);

          const messageResults: any[] = [];
          const messageListener = (event: ProviderMessage) => {
            if (event.type === "eth_subscription") {
              const subscriptionMessage = event as EthSubscription;
              if (filter === subscriptionMessage.data.subscription) {
                messageResults.push(subscriptionMessage.data.result);
              }
            }
          };

          ethereumProvider.addListener("message", messageListener);

          let shouldUnsubscribe = true;

          return () => {
            if (shouldUnsubscribe) {
              ethereumProvider.removeListener(
                "notifications",
                notificationsListener
              );

              ethereumProvider.removeListener("message", messageListener);
              shouldUnsubscribe = false;
            }

            return {
              notificationsResults,
              messageResults,
            };
          };
        }

        it("Supports newHeads subscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newHeads",
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );

          assert.lengthOf(getResults().notificationsResults, 3);
          assert.lengthOf(getResults().messageResults, 3);
        });

        it("Supports newPendingTransactions subscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newPendingTransactions",
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );

          await this.provider.send("eth_sendTransaction", [burnTxParams]);

          assert.lengthOf(getResults().notificationsResults, 1);
          assert.lengthOf(getResults().messageResults, 1);
        });

        it("Supports logs subscribe", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const filterId = await this.provider.send("eth_subscribe", [
            "logs",
            {
              address: exampleContract,
            },
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(getResults().notificationsResults, 1);
          assert.lengthOf(getResults().messageResults, 1);
        });
      });

      describe("eth_subscribe (websocket)", function () {
        let ws: WebSocket;

        beforeEach(async function () {
          if (this.serverInfo !== undefined) {
            const { address, port } = this.serverInfo;
            ws = new WebSocket(`ws://${address}:${port}`);

            // wait until the connection is ready
            await new Promise((resolve) => ws.on("open", resolve));
          } else {
            this.skip();
          }
        });

        afterEach(function () {
          if (ws !== undefined) {
            ws.close();
          }
        });

        it("Supports newHeads subscribe", async function () {
          const subscription = await subscribeTo("newHeads");

          const newBlockEvent = await sendMethodAndReturnEvent(
            "evm_mine",
            [],
            subscription
          );

          assert.equal(newBlockEvent.method, "eth_subscription");
          assert.equal(newBlockEvent.params.subscription, subscription);
        });

        it("Supports newPendingTransactions subscribe", async function () {
          const subscription = await subscribeTo("newPendingTransactions");

          const { result: accounts } = await sendMethod("eth_accounts");

          const newPendingTransactionEvent = await sendMethodAndReturnEvent(
            "eth_sendTransaction",
            [
              {
                from: accounts[0],
                to: accounts[0],
              },
            ],
            subscription
          );

          assert.equal(newPendingTransactionEvent.method, "eth_subscription");
          assert.equal(
            newPendingTransactionEvent.params.subscription,
            subscription
          );
        });

        it("Supports logs subscribe", async function () {
          const { result: accounts } = await sendMethod("eth_accounts");

          const exampleContract = await deployContractWs(
            `0x${EXAMPLE_CONTRACT.bytecode.object}`,
            accounts[0]
          );

          const subscription = await subscribeTo("newPendingTransactions", {
            address: exampleContract,
          });

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          const newLogEvent = await sendMethodAndReturnEvent(
            "eth_sendTransaction",
            [
              {
                from: accounts[0],
                to: exampleContract,
                data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
              },
            ],
            subscription
          );

          assert.equal(newLogEvent.method, "eth_subscription");
          assert.equal(newLogEvent.params.subscription, subscription);
        });

        async function subscribeTo(event: string, ...extraParams: any[]) {
          const subscriptionPromise = new Promise<string>((resolve) => {
            const listener: any = (message: any) => {
              const { result } = JSON.parse(message.toString());

              ws.removeListener("message", listener);
              resolve(result);
            };

            ws.on("message", listener);
          });

          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_subscribe",
              params: [event, ...extraParams],
            })
          );

          const subscription = await subscriptionPromise;

          return subscription;
        }

        /**
         * Send `method` with `params` and get the result.
         */
        async function sendMethod(method: string, params: any = []) {
          const id = Math.floor(Math.random() * 1_000_000_000);

          const resultPromise = new Promise<any>((resolve) => {
            const listener: any = (message: any) => {
              const parsedMessage = JSON.parse(message.toString());

              if (parsedMessage.id === id) {
                ws.removeListener("message", listener);
                resolve(parsedMessage);
              }
            };

            ws.on("message", listener);
          });

          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              method,
              params,
            })
          );

          const result = await resultPromise;

          return result;
        }

        /**
         * Send `method` with `params` and get the first message that corresponds to
         * the given subscription.
         */
        async function sendMethodAndReturnEvent(
          method: string,
          params: any = [],
          subscription: string
        ) {
          const eventPromise = new Promise<any>((resolve) => {
            const listener: any = (message: any) => {
              const parsedMessage = JSON.parse(message.toString());

              if (
                subscription !== undefined &&
                parsedMessage.params?.subscription === subscription
              ) {
                ws.removeListener("message", listener);
                resolve(parsedMessage);
              }
            };

            ws.on("message", listener);
          });

          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method,
              params,
            })
          );

          const event = await eventPromise;

          return event;
        }

        /**
         * Helper function to deploy a contract via ws
         */
        async function deployContractWs(bytecode: string, from: string) {
          const { result: txHash } = await sendMethod("eth_sendTransaction", [
            {
              from,
              data: bytecode,
            },
          ]);

          const {
            result: receipt,
          } = await sendMethod("eth_getTransactionReceipt", [txHash]);

          return receipt.contractAddress;
        }
      });

      describe("eth_subscribe (ethers.WebSocketProvider)", function () {
        let provider: ethers.providers.WebSocketProvider;

        beforeEach(async function () {
          if (this.serverInfo !== undefined) {
            const { address, port } = this.serverInfo;
            provider = new ethers.providers.WebSocketProvider(
              `ws://${address}:${port}`
            );
          } else {
            this.skip();
          }
        });

        it("'block' event works", async function () {
          return new Promise(async (resolve) => {
            provider.on("block", resolve);

            // If we call evm_mine immediately, the event won't be triggered
            // ideally `.on` would be async and resolve when the subscription is
            // registered, but that doesn't seem to be possible. So we wait a bit.
            await sleep(100);

            await provider.send("evm_mine", []);
          });
        });

        it("'pending' event works", async function () {
          return new Promise(async (resolve) => {
            provider.on("pending", resolve);
            await sleep(100);

            const signer = provider.getSigner();

            await signer.sendTransaction({
              to: await signer.getAddress(),
            });
          });
        });

        it("contract events work", async function () {
          return new Promise(async (resolve) => {
            const signer = provider.getSigner();

            const Factory = new ethers.ContractFactory(
              EXAMPLE_CONTRACT.abi,
              EXAMPLE_CONTRACT.bytecode,
              signer
            );

            const contract = await Factory.deploy();

            contract.on("StateModified", resolve);
            await sleep(100);

            await contract.modifiesState(1);
          });
        });
      });
    });
  });
});
