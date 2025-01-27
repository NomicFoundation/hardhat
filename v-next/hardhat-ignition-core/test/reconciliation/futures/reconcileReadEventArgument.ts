/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../../src/build-module.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
  ReadEventArgumentExecutionState,
} from "../../../src/internal/execution/types/execution-state.js";
import { FutureType } from "../../../src/types/module.js";
import { exampleAccounts } from "../../helpers.js";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  reconcile,
} from "../helpers.js";

describe("Reconciliation - read event argument", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const txId = "0x123";

  const exampleReadArgState: ReadEventArgumentExecutionState = {
    id: "Example",
    type: ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
    futureType: FutureType.READ_EVENT_ARGUMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    artifactId: "./artifact.json",
    eventName: "event1",
    nameOrIndex: "argument1",
    eventIndex: 0,
    emitterAddress: exampleAddress,
    txToReadFrom: txId,
    result: "first",
  };

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
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "EventName1", "arg1");

      return { contract };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract } = m.useModule(submoduleDefinition);

      return { contract };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Submodule#Contract",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleReadArgState,
          id: "Submodule#Contract.EventName1.arg1.0",
          status: ExecutionStatus.STARTED,
          eventName: "EventName1",
          nameOrIndex: "arg1",
        },
      ),
    );
  });

  it("should find changes to the event unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "EventChanged", "arg1", {
        id: "ReadEvent",
      });

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
          contractName: "Contract",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          eventName: "eventUnchanged",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure:
          "Event name has been changed from eventUnchanged to EventChanged",
      },
    ]);
  });

  it("should find changes to the argument unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argChanged", {
        id: "ReadEvent",
      });

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
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          nameOrIndex: "argUnchanged",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure:
          "Argument name or index has been changed from argUnchanged to argChanged",
      },
    ]);
  });

  it("should find changes to the event index unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argument1", {
        id: "ReadEvent",
        eventIndex: 3,
      });

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
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          eventIndex: 1,
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure: "Event index has been changed from 1 to 3",
      },
    ]);
  });

  it("should find changes to the emitter unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2");

      m.readEventArgument(contract1, "event1", "argument1", {
        id: "ReadEvent",
        emitter: contract2,
      });

      return { contract1, contract2 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract1",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Module#Contract2",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "Contract2",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
        },
        {
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          emitterAddress: exampleAddress,
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure:
          "Emitter has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8 (future Module#Contract2)",
      },
    ]);
  });

  it("should not reconcile the use of an event argument that has changed", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1");

      const readEvent1 = m.readEventArgument(contract1, "event1", "argument1", {
        id: "ReadEvent1",
      });

      const readEvent2 = m.readEventArgument(contract1, "event2", "argument2", {
        id: "ReadEvent2",
      });

      const contract2 = m.contract("Contract2", [readEvent2], {
        after: [readEvent1, readEvent2],
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
          ...exampleReadArgState,
          id: "Module#ReadEvent1",
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set(["Module#Contract1"]),
          eventName: "event1",
          nameOrIndex: "argument1",
          emitterAddress: exampleAddress,
          result: "first",
        },
        {
          ...exampleReadArgState,
          id: "Module#ReadEvent2",
          status: ExecutionStatus.SUCCESS,
          dependencies: new Set(["Module#Contract1"]),
          eventName: "event2",
          nameOrIndex: "argument2",
          emitterAddress: exampleAddress,
          result: "second",
        },
        {
          ...exampleDeploymentState,
          id: "Module#Contract2",
          status: ExecutionStatus.STARTED,
          dependencies: new Set(["Module#ReadEvent1", "Module#ReadEvent2"]),
          contractName: "Contract2",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: differentAddress,
          },
          constructorArgs: ["first"],
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
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argument1", {
        id: "ReadEvent",
      });

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
          contractName: "Contract",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          strategy: "create2",
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argument1", {
        id: "ReadEvent",
      });

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
          contractName: "Contract",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleReadArgState,
          id: "Module#ReadEvent",
          status: ExecutionStatus.STARTED,
          strategyConfig: { salt: "value" },
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#ReadEvent",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });
});
