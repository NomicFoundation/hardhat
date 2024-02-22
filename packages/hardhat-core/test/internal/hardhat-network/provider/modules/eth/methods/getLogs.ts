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

      describe("eth_getLogs", async function () {
        let firstBlockNumber: number;

        beforeEach(async function () {
          firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
        });

        it("Supports get logs", async function () {
          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000007b";

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: "0x0000000000000000000000000000000000000000",
              },
            ]),
            0
          );

          const logs = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
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

        it("Supports get logs with address", async function () {
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

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: exampleContract,
              },
            ]),
            1
          );

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                address: "0x0000000000000000000000000000000000000000",
              },
            ]),
            0
          );
        });

        it("Supports get logs with topics", async function () {
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

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  "0x3359f789ea83a10b6e9605d460de1088ff290dd7b3c9a155c896d45cf495ed4d",
                ],
              },
            ]),
            1
          );

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              },
            ]),
            0
          );
        });

        it("Supports get logs with null topic", async function () {
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

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                topics: [
                  null,
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
                ],
              },
            ]),
            1
          );
        });

        it("Supports get logs with multiple topic", async function () {
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

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlockNumber + 2),
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
            ]),
            2
          );
        });

        it("Supports get logs with fromBlock", async function () {
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

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlockNumber + 3),
              },
            ]),
            1
          );
        });

        it("Supports get logs with toBlock", async function () {
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

          await this.provider.send("eth_sendTransaction", [
            {
              to: exampleContract,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.lengthOf(
            await this.provider.send("eth_getLogs", [
              {
                fromBlock: numberToRpcQuantity(firstBlockNumber + 1),
                toBlock: numberToRpcQuantity(firstBlockNumber + 2),
              },
            ]),
            1
          );
        });

        it("should accept out of bound block numbers", async function () {
          const logs = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              fromBlock: numberToRpcQuantity(firstBlockNumber + 10000000),
            },
          ]);
          assert.lengthOf(logs, 0);

          const logs2 = await this.provider.send("eth_getLogs", [
            {
              address: "0x0000000000000000000000000000000000000000",
              fromBlock: numberToRpcQuantity(firstBlockNumber),
              toBlock: numberToRpcQuantity(firstBlockNumber + 1000000),
            },
          ]);
          assert.lengthOf(logs2, 0);
        });

        it("should return a new array every time", async function () {
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

          const logs1 = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
          ]);

          logs1[0].address = "changed";

          const logs2 = await this.provider.send("eth_getLogs", [
            {
              address: exampleContract,
            },
          ]);

          assert.notEqual(logs1, logs2);
          assert.notEqual(logs1[0], logs2[0]);
          assert.notEqual(logs2[0].address, "changed");
        });

        it("should have logIndex for logs in remote blocks", async function () {
          if (!isFork) {
            this.skip();
          }

          const logs = await this.provider.send("eth_getLogs", [
            {
              address: "0x2A07fBCD64BE0e2329890C21c6F34e81889a5912",
              topics: [
                "0x8f7de836135871245dd9c04f295aef602311da1591d262ecb4d2f45c7a88003d",
              ],
              fromBlock: numberToRpcQuantity(10721019),
              toBlock: numberToRpcQuantity(10721019),
            },
          ]);

          assert.lengthOf(logs, 1);
          assert.isDefined(logs[0].logIndex);
          assert.isNotNull(logs[0].logIndex);
        });
      });
    });
  });
});
