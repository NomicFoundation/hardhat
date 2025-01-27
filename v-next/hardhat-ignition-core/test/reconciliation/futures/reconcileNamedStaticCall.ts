/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../../src/build-module.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../../../src/internal/execution/types/execution-state.js";
import { FutureType } from "../../../src/types/module.js";
import { exampleAccounts } from "../../helpers.js";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers.js";

describe("Reconciliation - named static call", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
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

  const exampleStaticCallState: StaticCallExecutionState = {
    id: "Example",
    type: ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
    futureType: FutureType.STATIC_CALL,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    contractAddress: exampleAddress,
    artifactId: "./artifact.json",
    functionName: "function",
    args: [],
    nameOrIndex: 0,
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [1, "a"]);

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Submodule#Contract1.function1",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.SUCCESS,
          contractAddress: exampleAddress,
          functionName: "function1",
          args: [1, "a"],
        },
      ),
    );
  });

  it("should reconcile when the from is undefined but the exState's from is in the accounts list", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [1, "a"], 0, {
        from: undefined,
      });

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#Contract1.function1",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.SUCCESS,
          contractAddress: exampleAddress,
          functionName: "function1",
          args: [1, "a"],
          from: exampleAccounts[4],
        },
      ),
    );
  });

  it("should find changes to contract unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [], 0, { id: "config" });

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
          ...exampleStaticCallState,
          id: "Module#config",
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          contractAddress: exampleAddress,
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure:
          "Contract address has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8 (future Module#Contract1)",
      },
    ]);
  });

  it("should find changes to function name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "functionChanged", [], 0, { id: "config" });

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#config",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.STARTED,
          contractAddress: exampleAddress,
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

      m.staticCall(contract1, "function1", [{ ticker }], 0, {});

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#Contract1.function1",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.STARTED,
          contractAddress: exampleAddress,
          functionName: "function1",
          args: [{ ticker: "UNCHANGED" }],
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract1.function1",
        failure: "Argument at index 0 has been changed",
      },
    ]);
  });

  it("should reconcile an address arg with entirely different casing", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [
        "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      ]);

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#Contract1.function1",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          args: ["0x15D34AAF54267DB7D7C367839AAF71A00A2C6A65"],
        },
      ),
    );
  });

  it("should fail to reconcile an address arg with partially different casing", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [
        "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      ]);

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#Contract1.function1",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.STARTED,
          functionName: "function1",
          args: ["0x15d34aaf54267db7D7c367839aaf71a00a2c6a65"],
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract1.function1",
        failure: "Argument at index 0 has been changed",
      },
    ]);
  });

  it("should find changes to from unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [], 0, {
        id: "config",
        from: twoAddress,
      });

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#config",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.STARTED,
          contractAddress: exampleAddress,
          functionName: "function1",
          from: oneAddress,
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#config",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });

  it("should find changes to the argument unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.staticCall(contract, "function", [], "argChanged");

      return { contract };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
          contractName: "Contract",
        },
        {
          ...exampleStaticCallState,
          id: "Module#Contract.function",
          status: ExecutionStatus.STARTED,
          nameOrIndex: "argUnchanged",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract.function",
        failure:
          "Argument name or index has been changed from argUnchanged to argChanged",
      },
    ]);
  });

  it("should not reconcile the use of the result of a static call that has changed", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      const resultArg1 = m.staticCall(contract1, "function1", ["first"], 0, {
        id: "first_call",
      });
      const resultArg2 = m.staticCall(contract1, "function1", ["second"], 0, {
        id: "second_call",
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
    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          status: ExecutionStatus.SUCCESS,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#first_call",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set(["Module#Contract1"]),
          contractAddress: exampleAddress,
          functionName: "function1",
          args: ["first"],
          result: {
            type: ExecutionResultType.SUCCESS,
            value: "first",
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#second_call",
          futureType: FutureType.STATIC_CALL,
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set(["Module#Contract1", "Module#first_call"]),
          contractAddress: exampleAddress,
          functionName: "function1",
          args: ["second"],
          result: {
            type: ExecutionResultType.SUCCESS,
            value: "second",
          },
        },
        {
          ...exampleDeploymentState,
          id: "Module#Contract2",
          status: ExecutionStatus.STARTED,
          dependencies: new Set(["Module#first_call", "Module#second_call"]),
          contractName: "Contract2",
          constructorArgs: ["first"],
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract2",
        failure: "Argument at index 0 has been changed",
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      m.staticCall(contract1, "function1", [], 0, { id: "config" });

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#config",
          status: ExecutionStatus.STARTED,
          contractAddress: exampleAddress,
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

      m.staticCall(contract1, "function1", [], 0, { id: "config" });

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
            address: exampleAddress,
          },
        },
        {
          ...exampleStaticCallState,
          id: "Module#config",
          status: ExecutionStatus.STARTED,
          contractAddress: exampleAddress,
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
