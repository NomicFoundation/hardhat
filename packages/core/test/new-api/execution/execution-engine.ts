import { assert } from "chai";

import { Artifact, FutureType } from "../../../src";
import { defineModule } from "../../../src/new-api/define-module";
import { MemoryJournal } from "../../../src/new-api/internal/journal/memory-journal";
import {
  accumulateMessages,
  assertDeploymentFailure,
  assertDeploymentSuccess,
  exampleAccounts,
  setupDeployerWithMocks,
} from "../helpers";

describe("execution engine", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const accounts = exampleAccounts;
  const txId = "0x123";

  const contractWithThreeArgConstructorArtifact = {
    abi: [
      {
        type: "constructor",
        stateMutability: "payable",
        inputs: [
          {
            name: "_first",
            type: "string",
            internalType: "string",
          },
          {
            name: "_second",
            type: "string",
            internalType: "string",
          },
          {
            name: "_third",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    contractName: "Contract1",
    bytecode: "",
    linkReferences: {},
  };

  it("should execute a contract deploy", async () => {
    const journal = new MemoryJournal();

    const moduleDefinition = defineModule("Module1", (m) => {
      const account1 = m.getAccount(1);
      const supply = m.getParameter("supply", 1000);

      const contract1 = m.contract(
        "Contract1",
        [account1, supply, { nested: supply }],
        { from: account1 }
      );

      return { contract1 };
    });

    const deployer = setupDeployerWithMocks({
      journal,
      artifacts: {
        Contract1: contractWithThreeArgConstructorArtifact,
      },
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
      },
    });

    const result = await deployer.deploy(
      moduleDefinition,
      {
        Module1: { supply: 2000 },
      },
      exampleAccounts
    );

    assertDeploymentSuccess(result, {
      "Module1:Contract1": {
        contractName: "Contract1",
        contractAddress: exampleAddress,
        storedArtifactPath: "Module1:Contract1.json",
      },
    });

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
        from: accounts[1],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        futureId: "Module1:Contract1",
        transactionId: 1,
        contractName: "Contract1",
        args: [
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          2000,
          { nested: 2000 },
        ],
        value: BigInt(0).toString(),
        storedArtifactPath: "Module1:Contract1.json",
        from: accounts[1],
      },
      {
        type: "onchain-result",
        subtype: "deploy-contract-success",
        futureId: "Module1:Contract1",
        transactionId: 1,
        contractAddress: exampleAddress,
        txId,
      },
      {
        type: "execution-success",
        subtype: "deploy-contract",
        futureId: "Module1:Contract1",
        contractName: "Contract1",
        contractAddress: exampleAddress,
        txId,
      },
    ]);
  });

  it("should record a reverted contract deploy", async () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const account1 = m.getAccount(1);
      const contract1 = m.contract("Contract1", [], { from: account1 });

      return { contract1 };
    });

    const journal = new MemoryJournal();

    const deployer = setupDeployerWithMocks({
      journal,
      transactionResponses: {
        "Module1:Contract1": {
          1: {
            type: "onchain-result",
            subtype: "failure",
            futureId: "Module1:Contract1",
            transactionId: 1,
            error: new Error(
              "Cannot estimate gas; transaction may fail or may require manual gas limit"
            ),
          },
        },
      },
    });

    const result = await deployer.deploy(moduleDefinition, {}, exampleAccounts);

    assertDeploymentFailure(result, {
      "Module1:Contract1": new Error(
        "Cannot estimate gas; transaction may fail or may require manual gas limit"
      ),
    });

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
        constructorArgs: [],
        libraries: {},
        from: accounts[1],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        futureId: "Module1:Contract1",
        transactionId: 1,
        contractName: "Contract1",
        args: [],
        value: BigInt(0).toString(),
        from: accounts[1],
        storedArtifactPath: "Module1:Contract1.json",
      },
      {
        type: "onchain-result",
        subtype: "failure",
        futureId: "Module1:Contract1",
        transactionId: 1,
        error: new Error(
          "Cannot estimate gas; transaction may fail or may require manual gas limit"
        ),
      },
      {
        type: "execution-failure",
        futureId: "Module1:Contract1",
        error: new Error(
          "Cannot estimate gas; transaction may fail or may require manual gas limit"
        ),
      },
    ]);
  });

  it("should execute a library deploy", async () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const account2 = m.getAccount(2);
      const library1 = m.library("Library1", { from: account2 });

      return { library1 };
    });

    const journal = new MemoryJournal();

    const deployer = setupDeployerWithMocks({
      journal,
      transactionResponses: {
        "Module1:Library1": {
          1: {
            type: "onchain-result",
            subtype: "deploy-contract-success",
            futureId: "Module1:Library1",
            transactionId: 1,
            contractAddress: exampleAddress,
            txId,
          },
        },
      },
    });

    const result = await deployer.deploy(moduleDefinition, {}, exampleAccounts);

    assertDeploymentSuccess(result, {
      "Module1:Library1": {
        contractName: "Library1",
        storedArtifactPath: "Module1:Library1.json",
        contractAddress: exampleAddress,
      },
    });

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
        from: accounts[2],
      },
      {
        type: "onchain-action",
        subtype: "deploy-contract",
        futureId: "Module1:Library1",
        transactionId: 1,
        contractName: "Library1",
        args: [],
        value: BigInt(0).toString(),
        storedArtifactPath: "Module1:Library1.json",
        from: accounts[2],
      },
      {
        type: "onchain-result",
        subtype: "deploy-contract-success",
        futureId: "Module1:Library1",
        transactionId: 1,
        contractAddress: exampleAddress,
        txId,
      },
      {
        type: "execution-success",
        subtype: "deploy-contract",
        futureId: "Module1:Library1",
        contractName: "Library1",
        contractAddress: exampleAddress,
        txId,
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
      const account2 = m.getAccount(2);
      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [], {
        from: account2,
      });

      return { contract1 };
    });

    const journal = new MemoryJournal();

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
      },
    });

    const result = await deployer.deploy(moduleDefinition, {}, exampleAccounts);

    assertDeploymentSuccess(result, {
      "Module1:Contract1": {
        contractName: "Contract1",
        storedArtifactPath: "Module1:Contract1.json",
        contractAddress: exampleAddress,
      },
    });

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
            from: accounts[2],
          },
          {
            type: "onchain-action",
            subtype: "deploy-contract",
            futureId: "Module1:Contract1",
            transactionId: 1,
            contractName: "Contract1",
            args: [],
            value: BigInt(0).toString(),
            from: accounts[2],
            storedArtifactPath: "Module1:Contract1.json",
          },
          {
            type: "onchain-result",
            subtype: "deploy-contract-success",
            futureId: "Module1:Contract1",
            transactionId: 1,
            contractAddress: exampleAddress,
            txId,
          },
          {
            type: "execution-success",
            subtype: "deploy-contract",
            futureId: "Module1:Contract1",
            contractName: "Contract1",
            contractAddress: exampleAddress,
            txId,
          },
        ])
      )
    );
  });

  describe("with complex arguments", () => {
    it("should execute deploy when futures are passed as nested arguments", async () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const account1 = m.getAccount(1);
        const supply = m.getParameter("supply", 1000);

        const library1 = m.library("Library1", { from: account1 });

        const contract1 = m.contract(
          "Contract1",
          [{ nested: library1, arr: [account1, supply] }],
          {
            libraries: {
              Library1: library1,
            },
            from: account1,
          }
        );

        return { library1, contract1 };
      });

      const journal = new MemoryJournal();

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
          "Module1:Library1": {
            1: {
              type: "onchain-result",
              subtype: "deploy-contract-success",
              futureId: "Module1:Library1",
              transactionId: 1,
              contractAddress: differentAddress,
              txId,
            },
          },
        },
      });

      const result = await deployer.deploy(
        moduleDefinition,
        {},
        exampleAccounts
      );

      assertDeploymentSuccess(result, {
        "Module1:Contract1": {
          contractName: "Contract1",
          storedArtifactPath: "Module1:Contract1.json",
          contractAddress: exampleAddress,
        },
        "Module1:Library1": {
          contractName: "Library1",
          storedArtifactPath: "Module1:Library1.json",
          contractAddress: differentAddress,
        },
      });

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
          from: accounts[1],
        },
        {
          type: "onchain-action",
          subtype: "deploy-contract",
          futureId: "Module1:Library1",
          transactionId: 1,
          contractName: "Library1",
          args: [],
          value: BigInt(0).toString(),
          storedArtifactPath: "Module1:Library1.json",
          from: accounts[1],
        },
        {
          type: "onchain-result",
          subtype: "deploy-contract-success",
          futureId: "Module1:Library1",
          transactionId: 1,
          contractAddress: differentAddress,
          txId,
        },
        {
          type: "execution-success",
          subtype: "deploy-contract",
          futureId: "Module1:Library1",
          contractName: "Library1",
          contractAddress: differentAddress,
          txId,
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
              nested: differentAddress,
            },
          ],
          libraries: {
            Library1: "Module1:Library1",
          },
          from: accounts[1],
        },
        {
          type: "onchain-action",
          subtype: "deploy-contract",
          futureId: "Module1:Contract1",
          transactionId: 1,
          contractName: "Contract1",
          args: [
            {
              nested: differentAddress,
              arr: ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", 1000],
            },
          ],
          value: BigInt(0).toString(),
          storedArtifactPath: "Module1:Contract1.json",
          from: exampleAccounts[1],
        },
        {
          type: "onchain-result",
          subtype: "deploy-contract-success",
          futureId: "Module1:Contract1",
          transactionId: 1,
          contractAddress: exampleAddress,
          txId,
        },
        {
          type: "execution-success",
          subtype: "deploy-contract",
          futureId: "Module1:Contract1",
          contractName: "Contract1",
          contractAddress: exampleAddress,
          txId,
        },
      ]);
    });
  });
});
