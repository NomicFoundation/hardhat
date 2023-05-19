import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../../src/new-api/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - artifact contract", () => {
  const fakeArtifact = ["Fake artifact"] as any;

  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    storedArtifactPath: "./artifact.json",
    storedBuildInfoPath: "./build-info.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: undefined,
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contractFromArtifact(
        "Contract1",
        fakeArtifact,
        ["unchanged"],
        {
          libraries: {
            SafeMath: safeMath,
          },
        }
      );

      return { contract1 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Submodule:Contract1": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        constructorArgs: ["unchanged"],
        libraries: {
          SafeMath: exampleAddress,
        },
      },
    });
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractFromArtifact(
        "ContractChanged",
        fakeArtifact,
        [],
        { id: "Example" }
      );

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to constructors unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [
        "changed",
      ]);

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        constructorArgs: ["unchanged"],
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1",
        failure: "Constructor args have been changed",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Module:Contract1": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.HOLD,
        libraries: {},
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1",
        failure: "Libraries have been changed",
      },
    ]);
  });

  it("should find changes to value unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [], {
        id: "Example",
        value: BigInt(4),
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        value: BigInt(3),
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: "Value has been changed from 3 to 4",
      },
    ]);
  });

  it("should find changes to from unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, [], {
        id: "Example",
        from: "0x222",
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        from: "0x111",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: "From account has been changed from 0x111 to 0x222",
      },
    ]);
  });
});
