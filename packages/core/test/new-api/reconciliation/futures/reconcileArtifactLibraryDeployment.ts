import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../../src/new-api/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - artifact library", () => {
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

      const mainLib = m.libraryFromArtifact("MainLibrary", fakeArtifact, {
        libraries: { SafeMath: safeMath },
      });

      return { safeMath, mainLib };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { mainLib } = m.useModule(submoduleDefinition);

      return { mainLib };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Submodule:MainLibrary": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "MainLibrary",
        libraries: {
          SafeMath: exampleAddress,
        },
      },
    });
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const library1 = m.libraryFromArtifact("LibraryChanged", fakeArtifact, {
        id: "Example",
      });

      return { contract1: library1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "LibraryUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Library name has been changed from LibraryUnchanged to LibraryChanged",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const mainLib = m.libraryFromArtifact("MainLibrary", fakeArtifact, {
        libraries: { Changed: safeMath },
      });

      return { safeMath, mainLib };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Module:MainLibrary": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.HOLD,
        contractName: "MainLibrary",
        libraries: {
          Unchanged: exampleAddress,
        },
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:MainLibrary",
        failure: "Libraries have been changed",
      },
    ]);
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const library1 = m.libraryFromArtifact("Library1", fakeArtifact, {
        id: "Example",
        from: "0x222",
      });

      return { contract1: library1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "Library1",
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
