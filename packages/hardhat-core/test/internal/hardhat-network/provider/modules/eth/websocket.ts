import { assert } from "chai";
import { ethers } from "ethers";
import WebSocket from "ws";
import { rpcQuantityToBigInt } from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { JsonRpcRequest, JsonRpcResponse } from "../../../../../../src/types";

import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import { EXAMPLE_CONTRACT } from "../../../helpers/contracts";
import { setCWD } from "../../../helpers/cwd";
import { PROVIDERS } from "../../../helpers/providers";
import { sleep } from "../../../helpers/sleep";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("plain websocket", function () {
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

        it("Supports unsubscribe", async function () {
          const subscription = await subscribeTo("newHeads");
          const noSubscriptionPromise = checkNoSubscription(subscription, 100);
          await sendMethod("eth_unsubscribe", [subscription]);

          await sendMethod("evm_mine", []);

          await noSubscriptionPromise;
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

        it("Supports single and batched requests", async function () {
          const { result: accounts } = await sendMethod("eth_accounts");
          const [acc1, acc2] = accounts;

          // send a single request and validate the result
          const requestId1 = Math.floor(1000 * Math.random());
          const balanceResponse1 = await sendJson({
            jsonrpc: "2.0",
            id: requestId1,
            method: "eth_getBalance",
            params: [acc1],
          });

          assert.equal(balanceResponse1.id, requestId1);

          const balanceAccount1 = rpcQuantityToBigInt(balanceResponse1.result);
          assert.isTrue(balanceAccount1 > 0);

          // send batched requests and validate the results
          const requestId2 = Math.floor(1000 * Math.random());
          const requestId3 = Math.floor(1000 * Math.random());
          const balanceResponses = await sendJson([
            {
              jsonrpc: "2.0",
              id: requestId2,
              method: "eth_getBalance",
              params: [acc1],
            },
            {
              jsonrpc: "2.0",
              id: requestId3,
              method: "eth_getBalance",
              params: [acc2],
            },
          ]);

          const balanceResponse2 = balanceResponses.find(
            (x) => x.id === requestId2
          )!;
          const balanceResponse3 = balanceResponses.find(
            (x) => x.id === requestId3
          )!;

          // the first request in the batch uses the same address as the one in
          // the single request, so the results should match
          assert.equal(balanceResponse2.result, balanceResponse1.result);

          // it should return a valid value for the second account too
          const balanceAccount2 = rpcQuantityToBigInt(balanceResponse3.result);
          assert.isTrue(balanceAccount2 > 0);
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

        async function sendJson<
          TBody extends TReq | TReq[],
          TReq extends JsonRpcRequest,
          TResp extends JsonRpcResponse
        >(body: TBody): Promise<TBody extends TReq[] ? TResp[] : TResp> {
          const resultPromise = new Promise<any>((resolve) => {
            const listener: any = (message: any) => {
              const parsedMessage = JSON.parse(message.toString());
              const receivedId = Array.isArray(parsedMessage)
                ? parsedMessage[0]?.id
                : parsedMessage.id;
              const sentId = Array.isArray(body) ? body[0]?.id : body.id;

              if (receivedId === sentId) {
                ws.removeListener("message", listener);
                resolve(parsedMessage);
              }
            };

            ws.on("message", listener);
          });

          ws.send(JSON.stringify(body));
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

        function checkNoSubscription(subscription: string, timeout: number) {
          return new Promise<void>((resolve, reject) => {
            const listener: any = (message: any) => {
              const parsedMessage = JSON.parse(message.toString());

              if (
                subscription !== undefined &&
                parsedMessage.params?.subscription === subscription
              ) {
                ws.removeListener("message", listener);
                reject();
              }
            };

            setTimeout(() => {
              ws.removeListener("message", listener);
              resolve();
            }, timeout);

            ws.on("message", listener);
          });
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

          const { result: receipt } = await sendMethod(
            "eth_getTransactionReceipt",
            [txHash]
          );

          return receipt.contractAddress;
        }
      });

      describe("ethers.WebSocketProvider", function () {
        let provider: ethers.WebSocketProvider;

        beforeEach(async function () {
          if (this.serverInfo !== undefined) {
            const { address, port } = this.serverInfo;
            provider = new ethers.WebSocketProvider(`ws://${address}:${port}`);
          } else {
            this.skip();
          }
        });

        it("'block' event works", async function () {
          const onBlock = new Promise((resolve) =>
            provider.on("block", resolve)
          );

          // If we call evm_mine immediately, the event won't be triggered
          // ideally `.on` would be async and resolve when the subscription is
          // registered, but that doesn't seem to be possible. So we wait a bit.
          await sleep(100);
          await provider.send("evm_mine", []);

          return onBlock;
        });

        it("'pending' event works", async function () {
          const onPending = new Promise((resolve) =>
            provider.on("pending", resolve)
          );
          await sleep(100);

          const signer = await provider.getSigner();
          await signer.sendTransaction({
            to: await signer.getAddress(),
          });

          return onPending;
        });

        it("contract events work", async function () {
          const signer = await provider.getSigner();
          const Factory = new ethers.ContractFactory<[], ethers.Contract>(
            EXAMPLE_CONTRACT.abi,
            EXAMPLE_CONTRACT.bytecode,
            signer
          );
          const contract = await Factory.deploy();

          const onContractEvent = new Promise((resolve) =>
            contract.on("StateModified", resolve)
          );
          await sleep(100);

          await contract.modifiesState(1);

          return onContractEvent;
        });
      });
    });
  });
});
