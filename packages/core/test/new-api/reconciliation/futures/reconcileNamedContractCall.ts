import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../../src/new-api/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - named contract call", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

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
    contractAddress: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
  };

  const exampleContractCallState: CallExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_CALL,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    contractAddress: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    functionName: "function",
    args: [],
    value: BigInt("0"),
    from: undefined,
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "function1", [1, "a"], {});

      return { contract1 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
      },
      "Submodule:Contract1#function1": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.SUCCESS,
        functionName: "function1",
        args: [1, "a"],
      },
    });
  });

  it("should find changes to contract unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "function1", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: differentAddress,
      },
      "Module:Contract1#config": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.STARTED,
        functionName: "function1",
        contractAddress: exampleAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#config",
        failure:
          "Contract address has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8",
      },
    ]);
  });

  it("should find changes to function name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "functionChanged", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
      },
      "Module:Contract1#config": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.STARTED,
        functionName: "functionUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#config",
        failure:
          "Function name has been changed from functionUnchanged to functionChanged",
      },
    ]);
  });

  it("should find changes to function args unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "function1", ["changed"], {});

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
      },
      "Module:Contract1#function1": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.STARTED,
        functionName: "function1",
        args: ["unchanged"],
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#function1",
        failure: "Function args have been changed",
      },
    ]);
  });

  it("should find changes to value unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "function1", [], { id: "config", value: BigInt(3) });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
      },
      "Module:Contract1#config": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.STARTED,
        functionName: "function1",
        value: BigInt(2),
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#config",
        failure: "Value has been changed from 2 to 3",
      },
    ]);
  });

  it("should find changes to from unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "function1", [], { id: "config", from: "0x222" });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
      },
      "Module:Contract1#config": {
        ...exampleContractCallState,
        futureType: FutureType.NAMED_CONTRACT_CALL,
        status: ExecutionStatus.STARTED,
        functionName: "function1",
        from: "0x111",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#config",
        failure: "From account has been changed from 0x111 to 0x222",
      },
    ]);
  });
});
