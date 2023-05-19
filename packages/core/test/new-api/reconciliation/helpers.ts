import { assert } from "chai";

import { ModuleConstructor } from "../../../src/new-api/internal/module-builder";
import { Reconcilier } from "../../../src/new-api/internal/reconciliation/reconcilier";
import { ReconciliationResult } from "../../../src/new-api/internal/reconciliation/types";
import { ExecutionStateMap } from "../../../src/new-api/types/execution-state";
import {
  IgnitionModuleResult,
  ModuleParameters,
} from "../../../src/new-api/types/module";
import { IgnitionModuleDefinition } from "../../../src/new-api/types/module-builder";

export function reconcile(
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >,
  executionStateMap: ExecutionStateMap,
  moduleParameters: ModuleParameters = {}
): ReconciliationResult {
  const accounts: string[] = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  ];

  const constructor = new ModuleConstructor();
  const module = constructor.construct(moduleDefinition);

  // overwrite the id with the execution state map, makes writing tests
  // less error prone
  const updatedExecutionStateMap = Object.fromEntries(
    Object.entries(executionStateMap).map(([key, exState]) => [
      key,
      { ...exState, id: key },
    ])
  );

  const reconiliationResult = Reconcilier.reconcile(
    module,
    updatedExecutionStateMap,
    moduleParameters,
    accounts
  );

  return reconiliationResult;
}

export function assertNoWarningsOrErrors(
  reconciliationResult: ReconciliationResult
) {
  assert.equal(
    reconciliationResult.reconciliationFailures.length,
    0,
    `Unreconcilied futures found: \n${JSON.stringify(
      reconciliationResult.reconciliationFailures,
      undefined,
      2
    )}`
  );
  assert.equal(
    reconciliationResult.missingExecutedFutures.length,
    0,
    `Missing futures found: \n${JSON.stringify(
      reconciliationResult.missingExecutedFutures,
      undefined,
      2
    )}`
  );
}

export function assertSuccessReconciliation(
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >,
  previousExecutionState: ExecutionStateMap
): void {
  const reconciliationResult = reconcile(
    moduleDefinition,
    previousExecutionState
  );

  assertNoWarningsOrErrors(reconciliationResult);
}
