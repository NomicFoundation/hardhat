import { isDeploymentFuture } from "../../../type-guards";
import {
  ContractDeploymentFuture,
  ContractCallFuture,
  NamedArtifactContractDeploymentFuture,
  StaticCallFuture,
  EncodeFunctionCallFuture,
} from "../../../types/module";
import { resolveArgs } from "../../execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  DeploymentExecutionState,
  EncodeFunctionCallExecutionState,
  ExecutionSateType,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import { isAddress, equalAddresses } from "../../execution/utils/address";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";
import { fail } from "../utils";

export function reconcileArguments(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | StaticCallFuture<string, string>
    | ContractCallFuture<string, string>
    | EncodeFunctionCallFuture<string, string>,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | EncodeFunctionCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const unresolvedFutureArgs = isDeploymentFuture(future)
    ? future.constructorArgs
    : future.args;

  const futureArgs = resolveArgs(
    unresolvedFutureArgs,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts
  );

  const exStateArgs =
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
      ? exState.constructorArgs
      : exState.args;

  if (futureArgs.length !== exStateArgs.length) {
    return fail(
      future,
      `The number of arguments changed from ${exStateArgs.length} to ${futureArgs.length}`
    );
  }

  const isEqual = require("lodash/isEqual") as typeof import("lodash/isEqual");
  for (const [i, futureArg] of futureArgs.entries()) {
    const exStateArg = exStateArgs[i];

    // if both args are addresses, we need to compare the checksummed versions
    // to ensure case discrepancies are ignored
    if (isAddress(futureArg) && isAddress(exStateArg)) {
      if (!equalAddresses(futureArg, exStateArg)) {
        return fail(future, `Argument at index ${i} has been changed`);
      }
    } else if (!isEqual(futureArg, exStateArg)) {
      return fail(future, `Argument at index ${i} has been changed`);
    }
  }
}
