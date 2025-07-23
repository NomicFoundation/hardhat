import { assert } from "chai";

import { buildModule } from "../../../src/build-module.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state.js";
import { FutureType } from "../../../src/types/module.js";
import { exampleAccounts } from "../../helpers.js";
import {
  ArtifactMapDeploymentLoader,
  assertSuccessReconciliation,
  createDeploymentState,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers.js";

describe("Reconciliation - named library", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const safeMath = m.library("SafeMath");

      const mainLib = m.library("MainLibrary", {
        libraries: { SafeMath: safeMath },
      });

      return { safeMath, mainLib };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { mainLib } = m.useModule(submoduleDefinition);

      return { mainLib };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Submodule#SafeMath",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Submodule#MainLibrary",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          contractName: "MainLibrary",
          libraries: {
            SafeMath: exampleAddress,
          },
        },
      ),
    );
  });

  it("should find changes to library name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library = m.library("LibraryChanged", { id: "Library" });

      return { library };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Library",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "LibraryUnchanged",
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Library",
        failure:
          "Contract name has been changed from LibraryUnchanged to LibraryChanged",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const mainLib = m.library("MainLibrary", {
        libraries: { Changed: safeMath },
      });

      return { safeMath, mainLib };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#SafeMath",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Module#MainLibrary",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          contractName: "MainLibrary",
          libraries: {
            Unchanged: exampleAddress,
          },
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#MainLibrary",
        failure: "Library Unchanged has been removed",
      },
    ]);
  });

  it("should find changes to from unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library = m.library("Library", { id: "Library", from: twoAddress });

      return { library };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Library",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "Library",
        from: oneAddress,
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Library",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library = m.library("Library", { id: "Library" });

      return { library };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Library",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "Library",
        strategy: "create2",
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Library",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library = m.library("Library", { id: "Library" });

      return { library };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Library",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "Library",
        strategyConfig: { salt: "value" },
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Library",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });

  it("should find changes to a future's artifact bytecode reconciliable if the contract was successfully deployed", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.library("Contract1", {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract1",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        result: {
          type: ExecutionResultType.SUCCESS,
          address: exampleAddress,
        },
      }),
      new ArtifactMapDeploymentLoader({
        "./artifact.json": {
          contractName: "Contract1",
          bytecode: "0x1234",
          abi: [],
          deployedBytecode: "0x5678",
          _format: "hh3-artifact-1",
          sourceName: "Contract1.sol",
          linkReferences: {},
          deployedLinkReferences: {},
        },
      }),
    );

    assert.deepEqual(reconiliationResult.reconciliationFailures, []);
  });
});
