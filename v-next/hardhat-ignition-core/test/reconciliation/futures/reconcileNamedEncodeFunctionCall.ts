/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../../src/build-module.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  DeploymentExecutionState,
  EncodeFunctionCallExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state.js";
import { FutureType } from "../../../src/types/module.js";
import { exampleAccounts } from "../../helpers.js";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  reconcile,
} from "../helpers.js";

describe("Reconciliation - named encode function call", () => {
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

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

  const exampleEncodeFunctionCallState: EncodeFunctionCallExecutionState = {
    id: "Example",
    type: ExecutionSateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE,
    futureType: FutureType.ENCODE_FUNCTION_CALL,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    artifactId: "./artifact.json",
    functionName: "function",
    args: [],
    result: "",
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "function1", [1, "a", contract1], {});

      return { contract1 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Submodule#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Submodule#encodeFunctionCall(Submodule#Contract1.function1)",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.SUCCESS,
          functionName: "function1",
          args: [1, "a", differentAddress],
        },
      ),
    );
  });

  it("should find changes to future dependencies unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "function1", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract2",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Module#config",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure:
          "A dependency from Module#config to Module#Contract1 has been added. The former has started executing before the latter started executing, so this change is incompatible.",
      },
    ]);
  });

  it("should find changes to function name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "functionChanged", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Module#config",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "functionUnchanged",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure:
          "Function name has been changed from functionUnchanged to functionChanged",
      },
    ]);
  });

  it("should find changes to function args unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const ticker = m.getParameter("ticker", "CHANGED");

      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "function1", [[ticker]], {});

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Module#encodeFunctionCall(Module#Contract1.function1)",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          args: [["UNCHANGED"]],
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#encodeFunctionCall(Module#Contract1.function1)",
        failure: "Argument at index 0 has been changed",
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "function1", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Module#config",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          strategy: "create2",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.encodeFunctionCall(contract1, "function1", [], { id: "config" });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleEncodeFunctionCallState,
          id: "Module#config",
          futureType: FutureType.ENCODE_FUNCTION_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          strategyConfig: { salt: "value" },
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });
});
