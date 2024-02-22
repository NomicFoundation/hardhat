import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
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

      describe("eth_getFilterLogs", async function () {
        let firstBlockNumber: number;

        beforeEach(async function () {
          firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
        });

        it("Supports get filter logs", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [{}]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const logs = await this.provider.send("eth_getFilterLogs", [
            filterId,
          ]);
          assert.lengthOf(logs, 1);

          const log = logs[0];
          assert.strictEqual(log.removed, false);
          assert.strictEqual(log.logIndex, "0x0");
          assert.strictEqual(log.transactionIndex, "0x0");
          assert.strictEqual(
            rpcQuantityToNumber(log.blockNumber),
            firstBlockNumber + 2
          );
          assert.strictEqual(log.address, exampleContract);
          assert.strictEqual(log.data, `0x${newState}`);
        });

        it("Supports uninstalling an existing log filter", async function () {
          const filterId = await this.provider.send("eth_newFilter", [{}]);
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Supports get filter logs with address", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              address: exampleContract,
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with topics", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with null topic", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                null,
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with multiple topics", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          const filterId = await this.provider.send("eth_newFilter", [
            {
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });

        it("Supports get filter logs with fromBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const filterId = await this.provider.send("eth_newFilter", [
            {
              fromBlock: numberToRpcQuantity(firstBlockNumber),
              address: exampleContract,
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x000000000000000000000000000000000000000000000000000000000000003b",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            2
          );
        });

        it("Supports get filter logs with toBlock", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000003b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const filterId = await this.provider.send("eth_newFilter", [
            {
              fromBlock: numberToRpcQuantity(firstBlockNumber),
              toBlock: numberToRpcQuantity(firstBlockNumber + 2),
              address: exampleContract,
              topics: [
                [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
                [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                  "0x000000000000000000000000000000000000000000000000000000000000003b",
                ],
              ],
            },
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getFilterLogs", [filterId]),
            1
          );
        });
      });
    });
  });
});
