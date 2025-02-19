import { assert } from "chai";

import { buildModule } from "../../../src/build-module";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionStateType,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../../../src/internal/execution/types/execution-state";
import { getDefaultSender } from "../../../src/internal/execution/utils/get-default-sender";
import { FutureType } from "../../../src/types/module";
import { exampleAccounts } from "../../helpers";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  mockArtifact,
  reconcile,
} from "../helpers";

describe("Reconciliation - artifact contract at", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  const exampleContractAtState: ContractAtExecutionState = {
    id: "Example",
    type: ExecutionStateType.CONTRACT_AT_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_AT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    contractName: "Contract1",
    contractAddress: exampleAddress,
    artifactId: "./artifact.json",
  };

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionStateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    artifactId: "Example",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: getDefaultSender(exampleAccounts),
    networkInteractions: [],
  };

  const exampleStaticCallState: StaticCallExecutionState = {
    id: "Example",
    type: ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
    futureType: FutureType.STATIC_CALL,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    contractAddress: exampleAddress,
    artifactId: "./artifact.json",
    functionName: "function",
    args: [],
    nameOrIndex: 0,
    from: getDefaultSender(exampleAccounts),
    networkInteractions: [],
  };

  it("should reconcile when using an address string", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const contract1 = m.contractAt("Contract1", mockArtifact, exampleAddress);

      return { contract1 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    const deploymentState = createDeploymentState({
      ...exampleContractAtState,
      id: `Submodule#Contract1`,
      futureType: FutureType.CONTRACT_AT,
      status: ExecutionStatus.STARTED,
      contractAddress: exampleAddress,
      artifactId: "./artifact.json",
    });

    await assertSuccessReconciliation(moduleDefinition, deploymentState);
  });

  it("should reconcile when using a static call", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const example = m.contract("Example");
      const call = m.staticCall(example, "getAddress");

      const another = m.contractAt("Another", mockArtifact, call);

      return { another };
    });

    const deploymentState = createDeploymentState(
      {
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Example",
        result: {
          type: ExecutionResultType.SUCCESS,
          address: exampleAddress,
        },
      },
      {
        ...exampleStaticCallState,
        id: "Module#Example.getAddress",
        futureType: FutureType.STATIC_CALL,
        status: ExecutionStatus.SUCCESS,
        functionName: "getAddress",
        result: {
          type: ExecutionResultType.SUCCESS,
          value: differentAddress,
        },
      },
      {
        ...exampleContractAtState,
        id: "Module#Another",
        futureType: FutureType.CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractName: "Another",
        contractAddress: differentAddress,
        artifactId: "./artifact.json",
      }
    );

    await assertSuccessReconciliation(moduleDefinition, deploymentState);
  });

  it("should find changes to contract name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contractAt(
        "ContractChanged",
        mockArtifact,
        exampleAddress,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleContractAtState,
        id: "Module#Factory",
        futureType: FutureType.CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
        contractAddress: differentAddress,
        artifactId: "./artifact.json",
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Factory",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to contract address as a literal unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contractAt(
        "Contract1",
        mockArtifact,
        exampleAddress,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleContractAtState,
        id: "Module#Factory",
        futureType: FutureType.CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractAddress: differentAddress,
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Factory",
        failure:
          "Address has been changed from 0xBA12222222228d8Ba445958a75a0704d566BF2C8 to 0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contractAt(
        "Contract1",
        mockArtifact,
        exampleAddress,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleContractAtState,
        id: "Module#Factory",
        futureType: FutureType.CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        strategy: "create2",
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Factory",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contractAt(
        "Contract1",
        mockArtifact,
        exampleAddress,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleContractAtState,
        id: "Module#Factory",
        futureType: FutureType.CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        strategyConfig: {
          salt: "value",
        },
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Factory",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });
});
