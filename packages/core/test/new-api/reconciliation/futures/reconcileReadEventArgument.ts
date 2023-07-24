/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
  ReadEventArgumentExecutionState,
} from "../../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { exampleAccounts, initOnchainState } from "../../helpers";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - read event argument", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const txId = "0x123";

  const exampleReadArgState: ReadEventArgumentExecutionState = {
    id: "Example",
    futureType: FutureType.READ_EVENT_ARGUMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    artifactFutureId: "./artifact.json",
    eventName: "event1",
    argumentName: "argument1",
    eventIndex: 0,
    emitterAddress: exampleAddress,
    txToReadFrom: txId,
  };

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    artifactFutureId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
    txId,
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "EventName1", "arg1");

      return { contract };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract } = m.useModule(submoduleDefinition);

      return { contract };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:Contract": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract",
        contractAddress: exampleAddress,
      },
      "Submodule:Contract#EventName1#arg1#0": {
        ...exampleReadArgState,
        status: ExecutionStatus.STARTED,
        eventName: "EventName1",
        argumentName: "arg1",
      },
    });
  });

  it("should find changes to the event unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "EventChanged", "arg1", {
        id: "ReadEvent",
      });

      return { contract };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract",
        contractAddress: exampleAddress,
      },
      "Module:ReadEvent": {
        ...exampleReadArgState,
        status: ExecutionStatus.STARTED,
        eventName: "eventUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:ReadEvent",
        failure:
          "Event name has been changed from eventUnchanged to EventChanged",
      },
    ]);
  });

  it("should find changes to the argument unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argChanged", {
        id: "ReadEvent",
      });

      return { contract };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
        contractName: "Contract",
      },
      "Module:ReadEvent": {
        ...exampleReadArgState,
        status: ExecutionStatus.STARTED,
        argumentName: "argUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:ReadEvent",
        failure:
          "Argument name has been changed from argUnchanged to argChanged",
      },
    ]);
  });

  it("should find changes to the event index unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract = m.contract("Contract");

      m.readEventArgument(contract, "event1", "argument1", {
        id: "ReadEvent",
        eventIndex: 3,
      });

      return { contract };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
        contractName: "Contract",
      },
      "Module:ReadEvent": {
        ...exampleReadArgState,
        status: ExecutionStatus.STARTED,
        eventIndex: 1,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:ReadEvent",
        failure: "Event index has been changed from 1 to 3",
      },
    ]);
  });

  it("should find changes to the emitter unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2");

      m.readEventArgument(contract1, "event1", "argument1", {
        id: "ReadEvent",
        emitter: contract2,
      });

      return { contract1, contract2 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract1",
        contractAddress: exampleAddress,
      },
      "Module:Contract2": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "Contract2",
        contractAddress: differentAddress,
      },
      "Module:ReadEvent": {
        ...exampleReadArgState,
        status: ExecutionStatus.STARTED,
        emitterAddress: exampleAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:ReadEvent",
        failure:
          "Emitter has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8",
      },
    ]);
  });

  it("should not reconcile the use of an event argument that has changed", () => {
    const moduleDefinition = defineModule("Module", (m) => {
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
    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.SUCCESS,
        contractAddress: exampleAddress,
      },
      "Module:ReadEvent1": {
        ...exampleReadArgState,
        status: ExecutionStatus.SUCCESS,
        dependencies: new Set(["Module:Contract1"]),
        eventName: "event1",
        argumentName: "argument1",
        emitterAddress: exampleAddress,
        result: "first",
      },
      "Module:ReadEvent2": {
        ...exampleReadArgState,
        status: ExecutionStatus.SUCCESS,
        dependencies: new Set(["Module:Contract1"]),
        eventName: "event2",
        argumentName: "argument2",
        emitterAddress: exampleAddress,
        result: "second",
      },
      "Module:Contract2": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        dependencies: new Set(["Module:ReadEvent1", "Module:ReadEvent2"]),
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
