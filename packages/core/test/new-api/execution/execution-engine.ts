import { assert } from "chai";

import { FutureType } from "../../../src";
import { defineModule } from "../../../src/new-api/define-module";
import { Batcher } from "../../../src/new-api/internal/batcher";
import { ExecutionEngine } from "../../../src/new-api/internal/execution/execution-engine";
import { BasicExecutionStrategy } from "../../../src/new-api/internal/execution/execution-strategy";
import { ModuleConstructor } from "../../../src/new-api/internal/module-builder";
import { MemoryJournal } from "../../../src/new-api/journal";
import {
  Journal,
  JournalableMessage,
} from "../../../src/new-api/types/journal";
import { TransactionService } from "../../../src/new-api/types/transaction-service";
import { exampleAccounts } from "../helpers";

describe("execution engine", () => {
  it("should execute a contract deploy", async () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const constructor = new ModuleConstructor();
    const module = constructor.construct(moduleDefinition);

    assert.isDefined(module);

    const executionStateMap = {};

    const batches = Batcher.batch(module, {});

    const executionEngine = new ExecutionEngine();
    const journal = new MemoryJournal();
    const accounts: string[] = exampleAccounts;
    const mockTransactionService = setupMockTransactionService();

    const result = await executionEngine.execute({
      batches,
      module,
      executionStateMap,
      accounts,
      strategy: new BasicExecutionStrategy(),
      journal,
      transactionService: mockTransactionService,
    });

    assert.isDefined(result);
    const journalMessages = await accumulateMessages(journal);

    assert.deepStrictEqual(journalMessages, [
      {
        futureId: "Module1:Contract1",
        type: "execution-start",
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        strategy: "basic",
        dependencies: [],
        storedArtifactPath: "./artifact.json",
        storedBuildInfoPath: "./build-info.json",
        contractName: "Contract1",
        value: BigInt(0).toString(),
        constructorArgs: [],
        libraries: {},
        from: accounts[0],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        contractName: "Contract1",
        args: [],
        value: BigInt(0).toString(),
        from: exampleAccounts[0],
      },
      {
        type: "onchain-result",
        subtype: "deploy-contract",
        contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
      {
        type: "execution-success",
        subtype: "deploy-contract",
        futureId: "Module1:Contract1",
        contractName: "Contract1",
        contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    ]);
  });

  it("should execute a library deploy", async () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const library1 = m.library("Library1");

      return { library1 };
    });

    const constructor = new ModuleConstructor();
    const module = constructor.construct(moduleDefinition);

    assert.isDefined(module);

    const executionStateMap = {};

    const batches = Batcher.batch(module, {});

    const executionEngine = new ExecutionEngine();
    const journal = new MemoryJournal();
    const accounts: string[] = exampleAccounts;
    const mockTransactionService = setupMockTransactionService();

    const result = await executionEngine.execute({
      batches,
      module,
      executionStateMap,
      accounts,
      strategy: new BasicExecutionStrategy(),
      journal,
      transactionService: mockTransactionService,
    });

    assert.isDefined(result);
    const journalMessages = await accumulateMessages(journal);

    assert.deepStrictEqual(journalMessages, [
      {
        futureId: "Module1:Library1",
        type: "execution-start",
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        strategy: "basic",
        dependencies: [],
        storedArtifactPath: "./artifact.json",
        storedBuildInfoPath: "./build-info.json",
        contractName: "Library1",
        value: BigInt(0).toString(),
        constructorArgs: [],
        libraries: {},
        from: accounts[0],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        contractName: "Library1",
        args: [],
        value: BigInt(0).toString(),
        from: exampleAccounts[0],
      },
      {
        type: "onchain-result",
        subtype: "deploy-contract",
        contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
      {
        type: "execution-success",
        subtype: "deploy-contract",
        futureId: "Module1:Library1",
        contractName: "Library1",
        contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    ]);
  });
});

function setupMockTransactionService(): TransactionService {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  return {
    onchain: async () => ({
      type: "onchain-result",
      subtype: "deploy-contract",
      contractAddress: exampleAddress,
    }),
  } as TransactionService;
}

async function accumulateMessages(
  journal: Journal
): Promise<JournalableMessage[]> {
  const messages: JournalableMessage[] = [];

  for await (const message of journal.read()) {
    messages.push(message);
  }

  return messages;
}
