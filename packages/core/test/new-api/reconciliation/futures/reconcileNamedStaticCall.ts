import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { exampleAccounts, initOnchainState } from "../../helpers";
import {
  assertSuccessReconciliation,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers";

describe("Reconciliation - named static call", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

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

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [1, "a"]);

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
        contractAddress: exampleAddress,
      },
      "Submodule:Contract1#function1": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
        functionName: "function1",
        args: [1, "a"],
      },
    });
  });

  it("should find changes to contract unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: differentAddress,
      },
      "Module:Contract1#config": {
        ...exampleStaticCallState,
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

      m.staticCall(contract1, "functionChanged", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
      },
      "Module:Contract1#config": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.STARTED,
        contractAddress: exampleAddress,
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
      const ticker = m.getParameter("ticker", "CHANGED");

      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [{ ticker }], {});

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
      },
      "Module:Contract1#function1": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.STARTED,
        contractAddress: exampleAddress,
        functionName: "function1",
        args: [{ ticker: "UNCHANGED" }],
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#function1",
        failure: "Function args have been changed",
      },
    ]);
  });

  it("should find changes to from unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [], {
        id: "config",
        from: twoAddress,
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
      },
      "Module:Contract1#config": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.STARTED,
        contractAddress: exampleAddress,
        functionName: "function1",
        from: oneAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1#config",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });

  it("should not reconcile the use of the result of a static call that has changed", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      const resultArg1 = m.staticCall(contract1, "function1", ["first"], {
        id: "first-call",
      });
      const resultArg2 = m.staticCall(contract1, "function1", ["second"], {
        id: "second-call",
        after: [resultArg1],
      });

      const contract2 = m.contract("Contract2", [resultArg2], {
        after: [resultArg1, resultArg2],
      });

      return { contract1, contract2 };
    });

    // This state is the equivalent to above, but contract2's
    // constructor arg points at the result of the first call
    // rather than the second
    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
      },
      "Module:first-call": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.SUCCESS,
        dependencies: new Set(["Module:Contract1"]),
        contractAddress: exampleAddress,
        functionName: "function1",
        args: ["first"],
        result: "first",
      },
      "Module:Contract1#second-call": {
        ...exampleStaticCallState,
        futureType: FutureType.NAMED_STATIC_CALL,
        status: ExecutionStatus.SUCCESS,
        dependencies: new Set([
          "Module:Contract1",
          "Module:Contract1#first-call",
        ]),
        contractAddress: exampleAddress,
        functionName: "function1",
        args: ["second"],
        result: "second",
      },
      "Module:Contract2": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        dependencies: new Set([
          "Module:Contract1#first-call",
          "Module:Contract1#second-call",
        ]),
        contractName: "Contract2",
        contractAddress: differentAddress,
        constructorArgs: ["first"],
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract2",
        failure: "Constructor args have been changed",
      },
    ]);
  });
});
