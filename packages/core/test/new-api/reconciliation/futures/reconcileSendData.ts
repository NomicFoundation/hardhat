import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  ExecutionStatus,
  SendDataExecutionState,
} from "../../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { assertSuccessReconciliation, reconcile } from "../helpers";

describe("Reconciliation - send data", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  const exampleSendState: SendDataExecutionState = {
    id: "Example",
    futureType: FutureType.SEND_DATA,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    to: exampleAddress,
    data: "example_data",
    value: BigInt("0"),
    from: undefined,
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data");

      return {};
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const {} = m.useModule(submoduleDefinition);

      return {};
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:test_send": {
        ...exampleSendState,
        status: ExecutionStatus.STARTED,
      },
    });
  });

  it("should find changes to the to address unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      m.send("test_send", differentAddress, 0n, "example_data");

      return {};
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:test_send": {
        ...exampleSendState,
        status: ExecutionStatus.STARTED,
        to: exampleAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:test_send",
        failure:
          "To address has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8",
      },
    ]);
  });

  it("should find changes to the to data unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "changed_data");

      return {};
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:test_send": {
        ...exampleSendState,
        status: ExecutionStatus.STARTED,
        data: "unchanged_data",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:test_send",
        failure: "Data has been changed from unchanged_data to changed_data",
      },
    ]);
  });

  it("should find changes to the value unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      m.send("test_send", exampleAddress, 3n, "example_data");

      return {};
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:test_send": {
        ...exampleSendState,
        status: ExecutionStatus.STARTED,
        value: 2n,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:test_send",
        failure: "Value has been changed from 2 to 3",
      },
    ]);
  });

  it("should find changes to from unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data", {
        from: differentAddress,
      });

      return {};
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:test_send": {
        ...exampleSendState,
        status: ExecutionStatus.STARTED,
        from: exampleAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:test_send",
        failure: `From account has been changed from ${exampleAddress} to ${differentAddress}`,
      },
    ]);
  });
});
