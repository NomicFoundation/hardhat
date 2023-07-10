import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";
import { ethers } from "ethers";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import {
  EthereumProvider,
  EthSubscription,
  ProviderMessage,
} from "../../../../../../../types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { compileLiteral } from "../../../../stack-traces/compilation";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
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

      describe("eth_subscribe", function () {
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

        it("Supports logs subscribe via topic", async function () {
          const [
            ,
            {
              contracts: {
                ["literal.sol"]: { ContractA: contractA },
              },
            },
          ] = await compileLiteral(`
            //SPDX-License-Identifier: UNLICENSED;
            pragma solidity 0.8.0;
            contract ContractA {
              event TokensMinted(uint amount);
              function mint(uint amount) public {
                emit TokensMinted(amount);
              }
            }
          `);
          const address = await deployContract(
            this.provider,
            `0x${contractA.evm.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          const abiEncoder = new ethers.Interface(contractA.abi);
          const filterId = await this.provider.send("eth_subscribe", [
            "logs",
            {
              address,
              topic: abiEncoder.getEvent("TokensMinted")?.topicHash,
            },
          ]);

          const getResults = createFilterResultsGetter(this.provider, filterId);

          await this.provider.send("eth_sendTransaction", [
            {
              to: address,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: abiEncoder.encodeFunctionData("mint", [123]),
            },
          ]);

          assert.lengthOf(getResults().notificationsResults, 1);
        });
      });
    });
  });
});
