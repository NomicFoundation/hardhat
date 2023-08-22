import { assert } from "chai";

import { isContractFuture } from "../../../src";
import { ExecutionStateMap } from "../../../src/new-api/internal/execution/types";
import { Reconciler } from "../../../src/new-api/internal/reconciliation/reconciler";
import {
  ArtifactMap,
  ReconciliationResult,
} from "../../../src/new-api/internal/reconciliation/types";
import { getFuturesFromModule } from "../../../src/new-api/internal/utils/get-futures-from-module";
import {
  IgnitionModule,
  ModuleParameters,
} from "../../../src/new-api/types/module";
import { exampleAccounts } from "../helpers";

export const oneAddress = "0x1111111111111111111111111111111111111111";
export const twoAddress = "0x2222222222222222222222222222222222222222";

export function reconcile(
  ignitionModule: IgnitionModule,
  executionStateMap: ExecutionStateMap,
  moduleParameters: { [key: string]: ModuleParameters } = {},
  moduleArtifactMap?: ArtifactMap,
  storedArtifactMap?: ArtifactMap
): ReconciliationResult {
  // overwrite the id with the execution state map, makes writing tests
  // less error prone
  const updatedExecutionStateMap = Object.fromEntries(
    Object.entries(executionStateMap).map(([key, exState]) => [
      key,
      { ...exState, id: key },
    ])
  );

  const contracts =
    getFuturesFromModule(ignitionModule).filter(isContractFuture);

  moduleArtifactMap ??= Object.fromEntries(
    contracts.map((contract) => [
      contract.id,
      {
        contractName: contract.contractName,
        abi: [],
        bytecode: "0xaaaaaaaaaaa",
        linkReferences: {},
      },
    ])
  );

  storedArtifactMap ??= moduleArtifactMap;

  const reconiliationResult = Reconciler.reconcile(
    ignitionModule,
    updatedExecutionStateMap,
    moduleParameters,
    exampleAccounts,
    moduleArtifactMap,
    storedArtifactMap
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
  ignitionModule: IgnitionModule,
  previousExecutionState: ExecutionStateMap
): void {
  const reconciliationResult = reconcile(
    ignitionModule,
    previousExecutionState
  );

  assertNoWarningsOrErrors(reconciliationResult);
}
