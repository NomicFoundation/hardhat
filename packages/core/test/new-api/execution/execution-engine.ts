import { assert } from "chai";

import { Artifact, DeploymentLoader, FutureType } from "../../../src";
import { defineModule } from "../../../src/new-api/define-module";
import { Batcher } from "../../../src/new-api/internal/batcher";
import { ExecutionEngine } from "../../../src/new-api/internal/execution/execution-engine";
import { BasicExecutionStrategy } from "../../../src/new-api/internal/execution/execution-strategy";
import { MemoryJournal } from "../../../src/new-api/internal/journal/memory-journal";
import { ModuleConstructor } from "../../../src/new-api/internal/module-builder";
import {
  Journal,
  JournalableMessage,
} from "../../../src/new-api/types/journal";
import { TransactionService } from "../../../src/new-api/types/transaction-service";
import { exampleAccounts, setupMockArtifactResolver } from "../helpers";

describe("execution engine", () => {
  it("should execute a contract deploy", async () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const account1 = m.getAccount(1);
      const supply = m.getParameter("supply", 1000);

      const contract1 = m.contract("Contract1", [
        account1,
        supply,
        { nested: supply },
      ]);

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
    const mockArtifactResolver = setupMockArtifactResolver({} as any);
    const mockDeploymentLoader = setupMockDeploymentLoader(journal);

    const result = await executionEngine.execute({
      batches,
      module,
      executionStateMap,
      accounts,
      strategy: new BasicExecutionStrategy(),
      transactionService: mockTransactionService,
      artifactResolver: mockArtifactResolver,
      deploymentLoader: mockDeploymentLoader,
      deploymentParameters: {
        Module1: { supply: 2000 },
      },
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
        storedArtifactPath: "Module1:Contract1.json",
        storedBuildInfoPath: "build-info-12345.json",
        contractName: "Contract1",
        value: BigInt(0).toString(),
        constructorArgs: [
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          2000,
          { nested: 2000 },
        ],
        libraries: {},
        from: accounts[0],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        contractName: "Contract1",
        args: [
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          2000,
          { nested: 2000 },
        ],
        value: BigInt(0).toString(),
        from: exampleAccounts[0],
        storedArtifactPath: "Module1:Contract1.json",
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
    const mockArtifactResolver = setupMockArtifactResolver({} as any);
    const mockDeploymentLoader = setupMockDeploymentLoader(journal);

    const result = await executionEngine.execute({
      batches,
      module,
      executionStateMap,
      accounts,
      strategy: new BasicExecutionStrategy(),
      transactionService: mockTransactionService,
      artifactResolver: mockArtifactResolver,
      deploymentLoader: mockDeploymentLoader,
      deploymentParameters: {},
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
        storedArtifactPath: "Module1:Library1.json",
        storedBuildInfoPath: "build-info-12345.json",
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
        storedArtifactPath: "Module1:Library1.json",
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

  it("should execute an artifact contract deploy", async () => {
    const fakeArtifact: Artifact = {
      abi: [],
      contractName: "Contract1",
      bytecode: "",
      linkReferences: {},
    };

    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact);

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
    const mockArtifactResolver = setupMockArtifactResolver();
    const mockDeploymentLoader = setupMockDeploymentLoader(journal);

    const result = await executionEngine.execute({
      batches,
      module,
      executionStateMap,
      accounts,
      strategy: new BasicExecutionStrategy(),
      transactionService: mockTransactionService,
      artifactResolver: mockArtifactResolver,
      deploymentLoader: mockDeploymentLoader,
      deploymentParameters: {},
    });

    assert.isDefined(result);
    const journalMessages = await accumulateMessages(journal);

    assert.deepStrictEqual(
      journalMessages,
      JSON.parse(
        JSON.stringify([
          {
            futureId: "Module1:Contract1",
            type: "execution-start",
            futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
            strategy: "basic",
            dependencies: [],
            storedArtifactPath: "Module1:Contract1.json",
            storedBuildInfoPath: undefined,
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
            storedArtifactPath: "Module1:Contract1.json",
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
        ])
      )
    );
  });

  describe("with complex arguments", () => {
    it("should execute deploy when futures are passed as nested arguments", async () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.library("Library1");

        const account1 = m.getAccount(1);
        const supply = m.getParameter("supply", 1000);

        const contract1 = m.contract(
          "Contract1",
          [{ nested: library1, arr: [account1, supply] }],
          {
            libraries: {
              Library1: library1,
            },
          }
        );

        return { library1, contract1 };
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
      const mockArtifactResolver = setupMockArtifactResolver({} as any);
      const mockDeploymentLoader = setupMockDeploymentLoader(journal);

      const result = await executionEngine.execute({
        batches,
        module,
        executionStateMap,
        accounts,
        strategy: new BasicExecutionStrategy(),
        transactionService: mockTransactionService,
        artifactResolver: mockArtifactResolver,
        deploymentLoader: mockDeploymentLoader,
        deploymentParameters: {},
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
          storedArtifactPath: "Module1:Library1.json",
          storedBuildInfoPath: "build-info-12345.json",
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
          storedArtifactPath: "Module1:Library1.json",
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
        {
          futureId: "Module1:Contract1",
          type: "execution-start",
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          strategy: "basic",
          dependencies: ["Module1:Library1"],
          storedArtifactPath: "Module1:Contract1.json",
          storedBuildInfoPath: "build-info-12345.json",
          contractName: "Contract1",
          value: BigInt(0).toString(),
          constructorArgs: [
            {
              arr: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", 1000],
              nested: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
            },
          ],
          libraries: {
            Library1: "Module1:Library1",
          },
          from: accounts[0],
        },
        {
          type: "onchain-action",
          subtype: "deploy-contract",
          contractName: "Contract1",
          args: [
            {
              nested: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
              arr: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", 1000],
            },
          ],
          value: BigInt(0).toString(),
          from: exampleAccounts[0],
          storedArtifactPath: "Module1:Contract1.json",
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

function setupMockDeploymentLoader(journal: Journal): DeploymentLoader {
  return {
    journal,
    initialize: () => {
      throw new Error("Not implemented");
    },
    recordDeployedAddress: async () => {},
    storeArtifact: async (futureId, _artifact) => {
      return `${futureId}.json`;
    },
    storeBuildInfo: async (buildInfo) => {
      return `build-info-${buildInfo.id}.json`;
    },
    loadArtifact: async (_storedArtifactPath) => {
      throw new Error("Not implemented");
    },
  };
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
