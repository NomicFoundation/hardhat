import { assert } from "chai";

import { defineModule } from "../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../src/new-api/types/module";

import { assertSuccessReconciliation, reconcile } from "./helpers";

describe("Reconciliation", () => {
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

  it("should successfully reconcile on an empty execution state", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    assertSuccessReconciliation(moduleDefinition, {});
  });

  it("should find previous executed futures that have been left out of the current module", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module1:ContractMissed": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
      },
    });

    assert.deepStrictEqual(
      reconiliationResult.missingExecutedFutures,
      ["Module1:ContractMissed"],
      "Expected one missing previous executed future"
    );
  });

  it("should flag as unreconsiliable a future that has changed type", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const library1 = m.library("Library1", { id: "Example" });

      return { library1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module1:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module1:Example",
        failure:
          "Future with id Module1:Example has changed from NAMED_CONTRACT_DEPLOYMENT to NAMED_LIBRARY_DEPLOYMENT",
      },
    ]);
  });

  describe("dependencies", () => {
    it("should reconcile unchanged dependencies", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");
        const contract3 = m.contract("Contract3", [], {
          after: [contract1, contract2],
        });

        return { contract1, contract2, contract3 };
      });

      assertSuccessReconciliation(moduleDefinition, {
        "Module:Contract1": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract1",
        },
        "Module:Contract2": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract2",
        },
        "Module:Contract3": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          dependencies: new Set(["Module:Contract2", "Module:Contract2"]),
          contractName: "Contract3",
        },
      });
    });

    it("should reconcile the reduction of dependencies", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");
        const contract3 = m.contract("Contract3", [], {
          after: [contract2], // one less dep than execution state
        });

        return { contract1, contract2, contract3 };
      });

      assertSuccessReconciliation(moduleDefinition, {
        "Module:Contract1": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract1",
        },
        "Module:Contract2": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract2",
        },
        "Module:Contract3": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set(["Module:Contract1", "Module:Contract2"]),
          contractName: "Contract3",
        },
      });
    });

    it("should reconcile the addition of a dependency to a completed future", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [], {
          after: [contract1],
        });

        return { contract1, contract2 };
      });

      assertSuccessReconciliation(moduleDefinition, {
        "Module:Contract1": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract1",
        },
        "Module:Contract2": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          contractName: "Contract2",
          dependencies: new Set<string>(), // no deps on last run
        },
      });
    });

    it("should not reconcile the addition of a dependency that is not a success", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [], {
          after: [contract1],
        });

        return { contract1, contract2 };
      });

      const reconiliationResult = reconcile(moduleDefinition, {
        "Module:Contract1": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED, // Could still be in flight
          contractName: "Contract1",
        },
        "Module:Contract2": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set<string>(), // no deps on last run
          contractName: "Contract2",
        },
      });

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module:Contract2",
          failure:
            "A dependency from Module:Contract2 to Module:Contract1 has been added, and both futures had already started executing, so this change is incompatible",
        },
      ]);
    });

    it("should not reconcile the addition of a dependency that was not previously started", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contractNew = m.contract("ContractNew");
        const contract2 = m.contract("Contract2", [], {
          after: [contractNew],
        });

        return { contractNew, contract2 };
      });

      const reconiliationResult = reconcile(moduleDefinition, {
        "Module:Contract2": {
          ...exampleDeploymentState,
          futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          dependencies: new Set<string>(), // no deps on last run
          contractName: "Contract2",
        },
      });

      assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
        {
          futureId: "Module:Contract2",
          failure:
            "A dependency from Module:Contract2 to Module:ContractNew has been added. The former has started executing before the latter started executing, so this change is incompatible.",
        },
      ]);
    });
  });
});
