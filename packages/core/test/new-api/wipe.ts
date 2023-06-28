import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import { MemoryJournal } from "../../src/new-api/internal/journal/memory-journal";
import { Wiper } from "../../src/new-api/internal/wiper";
import { Journal } from "../../src/new-api/types/journal";
import { IgnitionModuleResult } from "../../src/new-api/types/module";
import { IgnitionModuleDefinition } from "../../src/new-api/types/module-builder";

import {
  accumulateMessages,
  exampleAccounts,
  setupDeployerWithMocks,
} from "./helpers";

describe("wipe", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const txId = "0x123";
  let journal: Journal;
  let moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >;
  let wiper: Wiper;

  beforeEach(async () => {
    journal = new MemoryJournal();
    wiper = new Wiper(journal);

    moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1", [], { after: [] });
      const contract2 = m.contract("Contract2", [], { after: [contract1] });
      const contract3 = m.contract("Contract3", [], { after: [contract2] });

      return { contract1, contract2, contract3 };
    });

    const deployer = setupDeployerWithMocks({
      journal,
      transactionResponses: {
        "Module1:Contract1": {
          1: {
            type: "onchain-result",
            subtype: "deploy-contract-success",
            futureId: "Module1:Contract1",
            transactionId: 1,
            contractAddress: exampleAddress,
            txId,
          },
        },
        "Module1:Contract2": {
          1: {
            type: "onchain-result",
            subtype: "failure",
            futureId: "Module1:Contract1",
            transactionId: 1,
            error: new Error("EVM revert"),
          },
        },
      },
    });

    await deployer.deploy(moduleDefinition, {}, exampleAccounts);
  });

  it("should allow wiping of future", async () => {
    await wiper.wipe("Module1:Contract2");

    const messages = await accumulateMessages(journal);

    assert.deepStrictEqual(messages[messages.length - 1], {
      futureId: "Module1:Contract2",
      type: "wipe",
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
