/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/build-module";
import {
  DeploymentExecutionState,
  ExecutionStateType,
  ExecutionStatus,
} from "../../src/internal/execution/types/execution-state";
import { getDefaultSender } from "../../src/internal/execution/utils/get-default-sender";
import { Reconciler } from "../../src/internal/reconciliation/reconciler";
import { FutureType } from "../../src/types/module";
import { exampleAccounts } from "../helpers";

import {
  ArtifactMapDeploymentLoader,
  ArtifactMapResolver,
  assertNoWarningsOrErrors,
  assertSuccessReconciliation,
  createDeploymentState,
  reconcile,
} from "./helpers";

describe("Reconciliation", () => {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Module1#Contract1",
    type: ExecutionStateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "Example",
    contractName: "Contract1",
    value: 0n,
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  it("should successfully reconcile on an empty execution state", async () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    await assertSuccessReconciliation(moduleDefinition, {
      chainId: 123,
      executionStates: {},
    });
  });

  it("should successfully reconcile even in with complex arguments", async () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contract("Contract1", [], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      const call = m.call(contract1, "test", []);

      const addressEventArg = m.readEventArgument(call, "Created", "address");
      const staticCallArg = m.staticCall(contract1, "readAddress", []);

      const contract2 = m.contract("Contract2", [
        addressEventArg,
        staticCallArg,
      ]);

      return { safeMath, contract1, contract2 };
    });

    await assertSuccessReconciliation(moduleDefinition, {
      chainId: 123,
      executionStates: {},
    });
  });

  it("should find previous executed futures that have been left out of the current module", async () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module1#ContractMissed", // This future is not in the module
        status: ExecutionStatus.STARTED,
      })
    );

    assert.deepStrictEqual(
      reconiliationResult.missingExecutedFutures,
      ["Module1#ContractMissed"],
      "Expected one missing previous executed future"
    );
  });

  it("should flag as unreconsiliable a future that has changed type", async () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const library1 = m.library("Library1", { id: "Example" });

      return { library1 };
    });

    const reconiliationResult = await reconcile(moduleDefinition, {
      chainId: 123,
      executionStates: {
        "Module1#Example": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
        },
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module1#Example",
        failure:
          "Future with id Module1#Example has changed from NAMED_ARTIFACT_CONTRACT_DEPLOYMENT to NAMED_ARTIFACT_LIBRARY_DEPLOYMENT",
      },
    ]);
  });

  it("should flag as PreviousRunError a future that timed out on the previous run", async () => {
    const reconiliationResult = Reconciler.checkForPreviousRunErrors({
      chainId: 123,
      executionStates: {
        "Module1#Example": {
          ...exampleDeploymentState,
          status: ExecutionStatus.TIMEOUT,
        },
      },
    });

    assert.deepStrictEqual(reconiliationResult, [
      {
        futureId: "Module1#Contract1",
        failure:
          "The previous run of the future Module1#Contract1 timed out, and will need wiped before running again",
      },
    ]);
  });

  it("should flag as PreviousRunError a future that failed on the previous run", async () => {
    const reconiliationResult = Reconciler.checkForPreviousRunErrors({
      chainId: 123,
      executionStates: {
        "Module1#Example": {
          ...exampleDeploymentState,
          status: ExecutionStatus.FAILED,
        },
      },
    });

    assert.deepStrictEqual(reconiliationResult, [
      {
        futureId: "Module1#Contract1",
        failure:
          "The previous run of the future Module1#Contract1 failed, and will need wiped before running again",
      },
    ]);
  });

  describe("from and accounts interactions", () => {
    it("should reconcile from where the module's is undefined, and the default account is the sender of the started execution state", async () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const contract1 = m.contract("Contract1", [], { from: undefined });

        return { contract1 };
      });

      const reconiliationResult = await reconcile(moduleDefinition, {
        chainId: 123,
        executionStates: {
          "Module1#Contract1": {
            ...exampleDeploymentState,
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.STARTED,
            from: getDefaultSender(exampleAccounts),
          },
        },
      });

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, []);
    });

    it("should flag as unreconsiliable a changed from where the history indicates a different from", async () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const account2 = m.getAccount(2);
        // from is accounts[2]
        const contract1 = m.contract("Contract1", [], { from: account2 });

        return { contract1 };
      });

      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          from: exampleAccounts[3],
        })
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module1#Contract1",
          failure: `From account has been changed from ${exampleAccounts[3]} to ${exampleAccounts[2]}`,
        },
      ]);
    });

    it("should reconcile an unchanged ModuleParameter<AccountRuntimeValue>", async () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const accountParam3 = m.getParameter("account3", m.getAccount(3));
        const contract1 = m.contract("Contract1", [accountParam3]);

        return { contract1 };
      });

      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          constructorArgs: [exampleAccounts[3]],
        })
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, []);
    });

    it("should flag as unreconsiliable a changed ModuleParameter<AccountRuntimeValue> where the history indicates a different account", async () => {
      const moduleDefinition = buildModule("Module1", (m) => {
        const accountParam2 = m.getParameter("account2", m.getAccount(2));
        const contract1 = m.contract("Contract1", [accountParam2]);

        return { contract1 };
      });

      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          constructorArgs: [exampleAccounts[3]],
        })
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module1#Contract1",
          failure: `Argument at index 0 has been changed`,
        },
      ]);
    });
  });

  describe("dependencies", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    it("should reconcile unchanged dependencies", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");
        const contract3 = m.contract("Contract3", [], {
          after: [contract1, contract2],
        });

        return { contract1, contract2, contract3 };
      });

      await assertSuccessReconciliation(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Contract1",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract1",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract2",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract2",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract3",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.STARTED,
            dependencies: new Set(["Module#Contract2", "Module#Contract2"]),
            contractName: "Contract3",
          }
        )
      );
    });

    it("should reconcile the reduction of dependencies", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");
        const contract3 = m.contract("Contract3", [], {
          after: [contract2], // one less dep than execution state
        });

        return { contract1, contract2, contract3 };
      });

      await assertSuccessReconciliation(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Contract1",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract1",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract2",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract2",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract3",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            dependencies: new Set(["Module#Contract1", "Module#Contract2"]),
            contractName: "Contract3",
          }
        )
      );
    });

    it("should reconcile the addition of a dependency to a completed future", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [], {
          after: [contract1],
        });

        return { contract1, contract2 };
      });

      await assertSuccessReconciliation(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Contract1",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract1",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract2",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.STARTED,
            contractName: "Contract2",
            dependencies: new Set<string>(), // no deps on last run
          }
        )
      );
    });

    it("should not reconcile the addition of a dependency that is not a success", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [], {
          after: [contract1],
        });

        return { contract1, contract2 };
      });

      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Contract1",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.STARTED, // Could still be in flight
            contractName: "Contract1",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract2",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            dependencies: new Set<string>(), // no deps on last run
            contractName: "Contract2",
          }
        )
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module#Contract2",
          failure:
            "A dependency from Module#Contract2 to Module#Contract1 has been added, and both futures had already started executing, so this change is incompatible",
        },
      ]);
    });

    it("should not reconcile the addition of a dependency where the dependent has alread started", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contractOriginal = m.contract("ContractOriginal");

        const contractNew = m.contract("ContractNew");
        const contract2 = m.contract("Contract2", [contractNew], {
          after: [contractOriginal],
        });

        return { contractOriginal, contractNew, contract2 };
      });

      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#ContractOriginal",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.SUCCESS,
            dependencies: new Set<string>(), // no deps on last run
            contractName: "ContractOriginal",
          },
          {
            ...exampleDeploymentState,
            id: "Module#Contract2",
            futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
            status: ExecutionStatus.STARTED,
            dependencies: new Set<string>("Module#ContractOriginal"), // no deps on last run
            contractName: "Contract2",
            constructorArgs: [exampleAddress],
          }
        )
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module#Contract2",
          failure:
            "A dependency from Module#Contract2 to Module#ContractNew has been added. The former has started executing before the latter started executing, so this change is incompatible.",
        },
      ]);
    });
  });

  describe("artifacts", () => {
    it("should reconcile unchanged bytecodes", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const moduleArtifactMap = {
        Contract1: {
          abi: [],
          bytecode: "0xaaaaaa",
          contractName: "Contract1",
          sourceName: "",
          linkReferences: {},
        },
      };

      const storedArtifactMap = {
        "Module#Contract1": moduleArtifactMap.Contract1,
      };

      const reconciliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          id: "Module#Contract1",
          artifactId: "Module#Contract1",
        }),
        new ArtifactMapDeploymentLoader(storedArtifactMap),
        new ArtifactMapResolver(moduleArtifactMap)
      );

      assertNoWarningsOrErrors(reconciliationResult);
    });

    it("should not reconcile changed bytecodes", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const moduleArtifactMap = {
        Contract1: {
          abi: [],
          bytecode: "0xaaaaaa",
          contractName: "Contract1",
          sourceName: "",
          linkReferences: {},
        },
      };

      const storedArtifactMap = {
        "Module#Contract1": {
          abi: [],
          bytecode: "0xbbbbbb",
          contractName: "Contract1",
          sourceName: "",
          linkReferences: {},
        },
      };

      const reconciliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          id: "Module#Contract1",
          artifactId: "Module#Contract1",
        }),
        new ArtifactMapDeploymentLoader(storedArtifactMap),
        new ArtifactMapResolver(moduleArtifactMap)
      );

      assert.deepStrictEqual(reconciliationResult.reconciliationFailures, [
        {
          futureId: "Module#Contract1",
          failure: "Artifact bytecodes have been changed",
        },
      ]);
    });

    it("should reconcile bytecodes if only the metadata changed", async () => {
      const METADATA_LENGTH_SIZE_IN_HEX = 4;
      const mainnetWethBytecode =
        "0x6060604052600436106100af576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806306fdde03146100b9578063095ea7b31461014757806318160ddd146101a157806323b872dd146101ca5780632e1a7d4d14610243578063313ce5671461026657806370a082311461029557806395d89b41146102e2578063a9059cbb14610370578063d0e30db0146103ca578063dd62ed3e146103d4575b6100b7610440565b005b34156100c457600080fd5b6100cc6104dd565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561010c5780820151818401526020810190506100f1565b50505050905090810190601f1680156101395780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561015257600080fd5b610187600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803590602001909190505061057b565b604051808215151515815260200191505060405180910390f35b34156101ac57600080fd5b6101b461066d565b6040518082815260200191505060405180910390f35b34156101d557600080fd5b610229600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803590602001909190505061068c565b604051808215151515815260200191505060405180910390f35b341561024e57600080fd5b61026460048080359060200190919050506109d9565b005b341561027157600080fd5b610279610b05565b604051808260ff1660ff16815260200191505060405180910390f35b34156102a057600080fd5b6102cc600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610b18565b6040518082815260200191505060405180910390f35b34156102ed57600080fd5b6102f5610b30565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561033557808201518184015260208101905061031a565b50505050905090810190601f1680156103625780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561037b57600080fd5b6103b0600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091908035906020019091905050610bce565b604051808215151515815260200191505060405180910390f35b6103d2610440565b005b34156103df57600080fd5b61042a600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610be3565b6040518082815260200191505060405180910390f35b34600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055503373ffffffffffffffffffffffffffffffffffffffff167fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c346040518082815260200191505060405180910390a2565b60008054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156105735780601f1061054857610100808354040283529160200191610573565b820191906000526020600020905b81548152906001019060200180831161055657829003601f168201915b505050505081565b600081600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040518082815260200191505060405180910390a36001905092915050565b60003073ffffffffffffffffffffffffffffffffffffffff1631905090565b600081600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054101515156106dc57600080fd5b3373ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16141580156107b457507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414155b156108cf5781600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015151561084457600080fd5b81600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825403925050819055505b81600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254039250508190555081600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190509392505050565b80600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410151515610a2757600080fd5b80600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825403925050819055503373ffffffffffffffffffffffffffffffffffffffff166108fc829081150290604051600060405180830381858888f193505050501515610ab457600080fd5b3373ffffffffffffffffffffffffffffffffffffffff167f7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65826040518082815260200191505060405180910390a250565b600260009054906101000a900460ff1681565b60036020528060005260406000206000915090505481565b60018054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610bc65780601f10610b9b57610100808354040283529160200191610bc6565b820191906000526020600020905b815481529060010190602001808311610ba957829003601f168201915b505050505081565b6000610bdb33848461068c565b905092915050565b60046020528160005260406000206020528060005260406000206000915091505054815600a165627a7a72305820deb4c2ccab3c2fdca32ab3f46728389c2fe2c165d5fafa07661e4e004f6c344a0029";
      // We modify the last two bytes before the metadata length
      const mainnetWethWithModifiedMetadata = `${mainnetWethBytecode.substring(
        0,
        mainnetWethBytecode.length - METADATA_LENGTH_SIZE_IN_HEX - 2
      )}00${mainnetWethBytecode.substring(
        mainnetWethBytecode.length - METADATA_LENGTH_SIZE_IN_HEX
      )}`;

      assert.notEqual(mainnetWethBytecode, mainnetWethWithModifiedMetadata);

      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const storedArtifactMap = {
        "Module#Contract1": {
          abi: [],
          bytecode: mainnetWethBytecode,
          contractName: "Contract1",
          sourceName: "",
          linkReferences: {},
        },
      };

      const moduleArtifactMap = {
        Contract1: {
          abi: [],
          bytecode: mainnetWethWithModifiedMetadata,
          contractName: "Contract1",
          sourceName: "",
          linkReferences: {},
        },
      };

      const reconciliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          id: "Module#Contract1",
          artifactId: "Module#Contract1",
        }),
        new ArtifactMapDeploymentLoader(storedArtifactMap),
        new ArtifactMapResolver(moduleArtifactMap)
      );

      assertNoWarningsOrErrors(reconciliationResult);
    });
  });

  describe("strategies", () => {
    it("should reconcile changes to strategy config if the future is already complete", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract", [], {
          id: "Example",
        });

        return { contract1 };
      });

      const deploymentState = createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract",
        strategy: "create2",
        strategyConfig: { salt: "value" },
      });

      await assertSuccessReconciliation(moduleDefinition, deploymentState);
    });

    it("should fail reconciliation on changes to the strategy (name) if the future is started but uncompleted", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract", [], {
          id: "Example1",
        });

        const contract2 = m.contract("Contract", [], {
          id: "Example2",
        });

        return { contract1, contract2 };
      });

      // Future Example1 is fine as it has completed, but running
      // with the basic strategy against the started but
      // unfinished Example2 should fail
      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Example1",
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract",
            strategy: "create2",
            strategyConfig: {},
          },
          {
            ...exampleDeploymentState,
            id: "Module#Example2",
            status: ExecutionStatus.STARTED,
            contractName: "Contract",
            strategy: "create2",
            strategyConfig: {},
          }
        )
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module#Example2",
          failure: 'Strategy changed from "create2" to "basic"',
        },
      ]);
    });

    it("should fail reconciliation on changes to strategy config if the future is started but uncompleted", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract1 = m.contract("Contract", [], {
          id: "Example1",
        });

        const contract2 = m.contract("Contract", [], {
          id: "Example2",
        });

        return { contract1, contract2 };
      });

      // Future Example1 is fine as it has completed, but running
      // with the basic strategy against the started but
      // unfinished Example2 should fail
      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState(
          {
            ...exampleDeploymentState,
            id: "Module#Example1",
            status: ExecutionStatus.SUCCESS,
            contractName: "Contract",
            strategy: "create2",
            strategyConfig: { salt: "value" },
          },
          {
            ...exampleDeploymentState,
            id: "Module#Example2",
            status: ExecutionStatus.STARTED,
            contractName: "Contract",
            strategy: "create2",
            strategyConfig: { salt: "value" },
          }
        ),
        undefined,
        undefined,
        {},
        "create2",
        { salt: "another-value" }
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module#Example2",
          failure:
            'Strategy config changed from {"salt":"value"} to {"salt":"another-value"}',
        },
      ]);
    });

    it("should pass reconciliation if the previous version did not support strategies, and the new run uses basic", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract = m.contract("Contract", [], {
          id: "Example",
        });

        return { contract };
      });

      // Future Example1 is fine as it has completed, but running
      // with the basic strategy against the started but
      // unfinished Example2 should fail
      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          id: "Module#Example",
          status: ExecutionStatus.STARTED,
          contractName: "Contract",
          strategy: "basic",
          strategyConfig: undefined as any, // This will be the case for the previous version of Ignition
        }),
        undefined,
        undefined,
        {},
        "basic",
        {}
      );

      assert.deepStrictEqual(reconiliationResult, {
        reconciliationFailures: [],
        missingExecutedFutures: [],
      });
    });

    it("should fail reconciliation if the previous version did not support strategies, and the new run uses basic", async () => {
      const moduleDefinition = buildModule("Module", (m) => {
        const contract = m.contract("Contract", [], {
          id: "Example",
        });

        return { contract };
      });

      // Future Example1 is fine as it has completed, but running
      // with the basic strategy against the started but
      // unfinished Example2 should fail
      const reconiliationResult = await reconcile(
        moduleDefinition,
        createDeploymentState({
          ...exampleDeploymentState,
          id: "Module#Example",
          status: ExecutionStatus.STARTED,
          contractName: "Contract",
          strategy: "basic",
          strategyConfig: undefined as any, // This will be the case for the previous version of Ignition
        }),
        undefined,
        undefined,
        {},
        "create2",
        {
          salt: "my-salt",
        }
      );

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          failure: 'Strategy changed from "basic" to "create2"',
          futureId: "Module#Example",
        },
      ]);
    });
  });
});
