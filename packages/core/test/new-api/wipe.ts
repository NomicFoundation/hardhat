/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { MemoryJournal } from "../../src/new-api/internal/journal/memory-journal";
import {
  Journal,
  JournalMessageType,
} from "../../src/new-api/internal/journal/types";
import { Wiper } from "../../src/new-api/internal/wiper";
import { IgnitionModule } from "../../src/new-api/types/module";

import {
  accumulateMessages,
  exampleAccounts,
  setupDeployerWithMocks,
} from "./helpers";

describe("wipe", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const txId = "0x123";
  let journal: Journal;
  let ignitionModule: IgnitionModule;
  let wiper: Wiper;

  beforeEach(async () => {
    journal = new MemoryJournal();
    wiper = new Wiper(journal);

    ignitionModule = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1", [], { after: [] });
      const contract2 = m.contract("Contract2", [], { after: [contract1] });
      const contract3 = m.contract("Contract3", [], { after: [contract2] });

      return { contract1, contract2, contract3 };
    });

    const deployer = setupDeployerWithMocks({
      journal,
      transactionResponses: {
        [exampleAccounts[0]]: {
          0: {
            blockNumber: 0,
            confirmations: 1,
            contractAddress: exampleAddress,
            transactionHash: txId,
          } as any,
        },
      },
      sendErrors: {
        [exampleAccounts[0]]: {
          1: () => {
            const error = new Error("");
            (error as any).reason = "EVM revert";
            throw error;
          },
        },
      },
    });

    await deployer.deploy(ignitionModule, {}, exampleAccounts);
  });

  it("should allow wiping of future", async () => {
    await wiper.wipe("Module1:Contract2");

    const messages = await accumulateMessages(journal);

    assert.deepStrictEqual(messages[messages.length - 1], {
      futureId: "Module1:Contract2",
      type: JournalMessageType.WIPE,
    });
  });

  it("should error if the future id doesn't exist", async () => {
    await assert.isRejected(
      wiper.wipe("Module1:Nonexistant"),
      "Cannot wipe Module1:Nonexistant as no state recorded against it"
    );
  });

  it("should error if other futures are depenent on the future being wiped", async () => {
    await assert.isRejected(
      wiper.wipe("Module1:Contract1"),
      "Cannot wipe Module1:Contract1 as there are dependent futures that have already started:\n  Module1:Contract2"
    );
  });
});
