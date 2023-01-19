/* eslint-disable import/no-unused-modules */

import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "dsl/buildModule";
import { TransactionsService } from "services/TransactionsService";
import { Artifact } from "types/hardhat";
import { Providers } from "types/providers";

import { Ignition } from "../../src/Ignition";
import { getMockServices } from "../helpers";
import { MemoryCommandJournal } from "../util/MemoryCommandJournal";

describe("Reruning execution", () => {
  const tokenArtifact: Artifact = {
    contractName: "Token",
    abi: [
      {
        name: "ConfigComplete",
        type: "event",
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "name",
            type: "address",
          },
        ],
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "supply",
            type: "uint256",
          },
        ],
        name: "configure",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    bytecode: "0x0000000001",
    linkReferences: {},
  };

  describe("when a deploment is already complete", () => {
    let sentTransactionCount: number;
    let ignition: Ignition;
    let myModule: any;

    beforeEach(() => {
      sentTransactionCount = 0;

      myModule = buildModule("MyModule", (m) => {
        const token = m.contract("Token");

        m.call(token, "configure", { args: [100] });

        return { token };
      });

      ignition = new Ignition({
        services: {
          ...getMockServices(),
          artifacts: {
            hasArtifact: () => true,
            getArtifact: () => tokenArtifact,
          },
          transactions: {
            wait: (tx) => {
              sentTransactionCount++;

              if (tx === "0x00001") {
                return {
                  contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
                };
              }

              if (tx === "0x00002") {
                return {};
              }

              throw new Error(`Unexpected transaction sent: ${tx}`);
            },
          },
        } as any,
        journal: new MemoryCommandJournal(),
      });
    });

    it("should record complete on first run", async () => {
      // Act
      const [result] = await ignition.deploy(myModule, {} as any);

      // Assert
      assert.equal(result._kind, "success");

      // two transactions have been sent
      assert.equal(sentTransactionCount, 2, "precondition before rerun");
    });

    it("should not rerun any on-chain transactions on second run", async () => {
      // Arrange
      await ignition.deploy(myModule, {} as any);

      // Act
      const [redeployResult] = await ignition.deploy(myModule, {} as any);

      // Assert
      assert.equal(redeployResult._kind, "success");

      // only two on-chain transactions happen, none from the rerun
      assert.equal(
        sentTransactionCount,
        2,
        "postcondition on-chain transactions"
      );

      assert.equal(redeployResult._kind, "success");
      if (redeployResult._kind !== "success") {
        return assert.fail("Not a successful deploy");
      }

      if (redeployResult.result.token._kind !== "contract") {
        return assert.fail("Unable to retrieve the token contract result");
      }

      assert.equal(
        redeployResult.result.token.value.address,
        "0x1F98431c8aD98523631AE4a59f267346ea31F984"
      );
    });
  });

  describe("when a deployment is on hold", () => {
    let sentTransactionCount: number;
    let eventQueryCount: number;
    let ignition: Ignition;
    let myModule: any;

    beforeEach(() => {
      sentTransactionCount = 0;
      eventQueryCount = 0;

      myModule = buildModule("MyModule", (m) => {
        const token = m.contract("Token", tokenArtifact);

        const configureCall = m.call(token, "configure", { args: [100] });

        m.event(token as any, "ConfigComplete", {
          after: [configureCall],
          args: [],
        });

        return { token };
      });

      const iface = new ethers.utils.Interface(tokenArtifact.abi);

      const fakeLog = iface.encodeEventLog(
        ethers.utils.EventFragment.from(tokenArtifact.abi[0]),
        ["0x0000000000000000000000000000000000000003"]
      );

      ignition = new Ignition({
        services: {
          ...getMockServices(),
          artifacts: {
            hasArtifact: () => true,
            getArtifact: () => tokenArtifact,
          },
          transactions: {
            wait: (tx) => {
              sentTransactionCount++;

              if (tx === "0x00001") {
                return {
                  contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
                };
              }

              if (tx === "0x00002") {
                return {};
              }

              throw new Error(`Unexpected transaction sent: ${tx}`);
            },
            waitForEvent: async () => {
              eventQueryCount++;

              if (eventQueryCount === 1) {
                return null;
              } else if (eventQueryCount === 2) {
                return fakeLog;
              } else {
                throw new Error("Unexpected query call");
              }
            },
          },
        } as any,
        journal: new MemoryCommandJournal(),
      });
    });

    it("should record hold on first run", async () => {
      // Act
      const [result] = await ignition.deploy(myModule, {} as any);

      // Assert
      assert.equal(result._kind, "hold");

      // two calls sent
      assert.equal(
        sentTransactionCount,
        2,
        "Wrong number of on-chain transactions"
      );

      // one event waited for
      assert.equal(eventQueryCount, 1, "Wrong number of on-chain queries");
    });

    it("should rerun the await event on a rerun", async () => {
      // arrange
      await ignition.deploy(myModule, {} as any);

      // Act
      const [redeployResult] = await ignition.deploy(myModule, {} as any);

      // Assert
      // only the original two transactions, no more
      assert.equal(sentTransactionCount, 2, "postconditition after rerun");

      // additional query call on second run
      assert.equal(eventQueryCount, 2, "Wrong number of on-chain queries");

      if (redeployResult._kind !== "success") {
        return assert.fail("Not a successful deploy");
      }

      if (redeployResult.result.token._kind !== "contract") {
        return assert.fail("Unable to retrieve the token contract result");
      }

      assert.equal(
        redeployResult.result.token.value.address,
        "0x1F98431c8aD98523631AE4a59f267346ea31F984"
      );
    });

    it("should return on hold if there is an error waiting for the tx hash to confirm", async () => {
      myModule = buildModule("TxModule", (m) => {
        const token = m.contract("Token", tokenArtifact);

        return { token };
      });

      ignition = new Ignition({
        services: {
          ...getMockServices(),
          artifacts: {
            hasArtifact: () => true,
            getArtifact: () => tokenArtifact,
          },
          transactions: new TransactionsService({} as Providers),
        } as any,
        journal: new MemoryCommandJournal(),
      });

      const [result] = await ignition.deploy(myModule, {} as any);

      assert.equal(result._kind, "hold");
    });
  });

  describe("when a deployment fails", () => {
    let sentTransactionCount;
    let ignition: Ignition;
    let myModule: any;

    beforeEach(() => {
      sentTransactionCount = 0;
      let configureCallErroredBefore = false;

      myModule = buildModule("MyModule", (m) => {
        const token = m.contract("Token");

        m.call(token, "configure", { args: [100] });

        return { token };
      });

      ignition = new Ignition({
        services: {
          ...getMockServices(),
          artifacts: {
            hasArtifact: () => true,
            getArtifact: () => tokenArtifact,
          },
          contracts: {
            transactionCount: 0,
            async sendTx(): Promise<string> {
              this.transactionCount++;

              if (this.transactionCount === 2) {
                if (!configureCallErroredBefore) {
                  configureCallErroredBefore = true;
                  throw new Error("Revert: All the apes have gone!");
                } else {
                  return `0x0000${this.contractCount}`;
                }
              }

              return `0x0000${this.contractCount}`;
            },
          },
          transactions: {
            wait: () => {
              sentTransactionCount++;

              return {
                contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
              };
            },
          },
        } as any,
        journal: new MemoryCommandJournal(),
      });
    });

    it("should record fail on first run", async () => {
      // Act
      const [result] = await ignition.deploy(myModule, {} as any);

      // Assert
      assert.equal(result._kind, "failure");

      // two calls sent
      assert.equal(
        sentTransactionCount,
        1,
        "Wrong number of on-chain transactions"
      );

      assert.deepStrictEqual(result, {
        _kind: "failure",
        failures: [
          "execution failed",
          [new Error("Revert: All the apes have gone!")],
        ],
      });
    });

    it("should recall the failed transaction on a rerun", async () => {
      // Arrange
      await ignition.deploy(myModule, {} as any);

      // Act
      const [redeployResult] = await ignition.deploy(myModule, {} as any);

      // Assert
      // the second transaction is successfully sent
      assert.equal(sentTransactionCount, 2, "postconditition after rerun");

      assert.equal(redeployResult._kind, "success");
      if (redeployResult._kind !== "success") {
        return assert.fail("Not a successful deploy");
      }

      if (redeployResult.result.token._kind !== "contract") {
        return assert.fail("Unable to retrieve the token contract result");
      }

      assert.equal(
        redeployResult.result.token.value.address,
        "0x1F98431c8aD98523631AE4a59f267346ea31F984"
      );
    });
  });
});
