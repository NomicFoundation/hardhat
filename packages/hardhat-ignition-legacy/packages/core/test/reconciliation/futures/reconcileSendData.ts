/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../../src/build-module";
import {
  ExecutionSateType,
  ExecutionStatus,
  SendDataExecutionState,
} from "../../../src/internal/execution/types/execution-state";
import { FutureType } from "../../../src/types/module";
import { exampleAccounts } from "../../helpers";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  reconcile,
} from "../helpers";

describe("Reconciliation - send data", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

  const exampleSendState: SendDataExecutionState = {
    id: "Example",
    type: ExecutionSateType.SEND_DATA_EXECUTION_STATE,
    futureType: FutureType.SEND_DATA,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    to: exampleAddress,
    data: "example_data",
    value: BigInt("0"),
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data");

      return {};
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const {} = m.useModule(submoduleDefinition);

      return {};
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Submodule#test_send",
        status: ExecutionStatus.STARTED,
      })
    );
  });

  /**
   * This test here is in a first run, the from is undefined and the defaultSender is used.
   * On the second run the from is undefined but a different defaultSender is now in play.
   * We say this should reconcile but the account from the first run should be used, as long
   * as it is in the accounts list.
   */
  it("should reconcile where the future is undefined but the exState's from is in the accounts list", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data", {
        from: undefined,
      });

      return {};
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
      })
    );
  });

  it("should reconcile between undefined and 0x for data", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, undefined);

      return {};
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        data: "0x",
      })
    );
  });

  it("should reconcile between `to` and an account value", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const givenAccount = m.getAccount(2);

      m.send("test_send", givenAccount, 0n, "example_data");

      return {};
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        to: exampleAccounts[2],
        data: "example_data",
      })
    );
  });

  it("should find changes to the to address unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", differentAddress, 0n, "example_data");

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        to: exampleAddress,
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure:
          'Address "to" has been changed from 0x1F98431c8aD98523631AE4a59f267346ea31F984 to 0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      },
    ]);
  });

  it("should find changes to the to data unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "changed_data");

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        data: "unchanged_data",
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure: "Data has been changed from unchanged_data to changed_data",
      },
    ]);
  });

  it("should find changes to the value unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 3n, "example_data");

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        value: 2n,
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure: "Value has been changed from 2 to 3",
      },
    ]);
  });

  it("should find changes to from unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data", {
        from: differentAddress,
      });

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        from: exampleAddress,
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure: `From account has been changed from ${exampleAddress} to ${differentAddress}`,
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data");

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        strategy: "create2",
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      m.send("test_send", exampleAddress, 0n, "example_data");

      return {};
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleSendState,
        id: "Module#test_send",
        status: ExecutionStatus.STARTED,
        strategyConfig: { salt: "value" },
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#test_send",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });
});
