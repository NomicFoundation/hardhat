import { assert } from "chai";

import { Artifact } from "../../../../src";
import { defineModule } from "../../../../src/new-api/define-module";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { exampleAccounts, initOnchainState } from "../../helpers";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - artifact contract at", () => {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  const exampleContractAtState: ContractAtExecutionState = {
    id: "Example",
    futureType: FutureType.ARTIFACT_CONTRACT_AT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    contractName: "Contract1",
    contractAddress: exampleAddress,
    storedArtifactPath: "./artifact.json",
  };

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    storedArtifactPath: "./artifact.json",
    storedBuildInfoPath: "./build-info.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  const exampleStaticCallState: StaticCallExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_STATIC_CALL,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    contractAddress: exampleAddress,
    storedArtifactPath: "./artifact.json",
    functionName: "function",
    args: [],
    from: exampleAccounts[0],
  };

  it("should reconcile when using an address string", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const contract1 = m.contractAtFromArtifact(
        "Contract1",
        exampleAddress,
        fakeArtifact
      );

      return { contract1 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    const previousExecutionState: ExecutionStateMap = {
      [`Submodule:Contract1`]: {
        ...exampleContractAtState,
        futureType: FutureType.ARTIFACT_CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractAddress: exampleAddress,
        storedArtifactPath: "./artifact.json",
      },
    };

    assertSuccessReconciliation(moduleDefinition, previousExecutionState);
  });

  it("should reconcile when using a static call", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const example = m.contract("Example");
      const call = m.staticCall(example, "getAddress");

      const another = m.contractAtFromArtifact("Another", call, fakeArtifact);

      return { another };
    });

    const previousExecutionState: ExecutionStateMap = {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Example",
        contractAddress: exampleAddress,
      },
      "Module:Example#getAddress": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.SUCCESS,
        functionName: "getAddress",
        result: differentAddress,
      },
      "Module:Another": {
        ...exampleContractAtState,
        futureType: FutureType.ARTIFACT_CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractName: "Another",
        contractAddress: differentAddress,
        storedArtifactPath: "./artifact.json",
      },
    };

    assertSuccessReconciliation(moduleDefinition, previousExecutionState);
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractAtFromArtifact(
        "ContractChanged",
        exampleAddress,
        fakeArtifact,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Factory": {
        ...exampleContractAtState,
        futureType: FutureType.ARTIFACT_CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
        contractAddress: differentAddress,
        storedArtifactPath: "./artifact.json",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Factory",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to contract address as a literal unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractAtFromArtifact(
        "Contract1",
        exampleAddress,
        fakeArtifact,
        {
          id: "Factory",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Factory": {
        ...exampleContractAtState,
        futureType: FutureType.ARTIFACT_CONTRACT_AT,
        status: ExecutionStatus.STARTED,
        contractAddress: differentAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Factory",
        failure:
          "Address has been changed from 0xBA12222222228d8Ba445958a75a0704d566BF2C8 to 0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    ]);
  });
});
