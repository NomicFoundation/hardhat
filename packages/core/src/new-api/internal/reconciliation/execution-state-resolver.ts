import { IgnitionError } from "../../../errors";
import { isContractFuture, isRuntimeValue } from "../../type-guards";
import {
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  Future,
  ModuleParameterRuntimeValue,
} from "../../types/module";
import {
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStateMap,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";
import { isAddress } from "../utils";
import { replaceWithinArg } from "../utils/replace-within-arg";

import { ReconciliationContext } from "./types";
import { resolveModuleParameter, safeToString } from "./utils";

// TODO: consider merging this into the execution state map
export class ExecutionStateResolver {
  public static resolveArgsFromExectuionState(
    constructorArgs: ArgumentType[],
    context: ReconciliationContext
  ): ArgumentType[] {
    return replaceWithinArg<ArgumentType>(constructorArgs, {
      bigint: (bi) => bi.toString(),
      future: (f) => {
        if (!isContractFuture(f)) {
          throw new IgnitionError(
            `Cannot replace future in args, for non-deployable futures ${f.id}`
          );
        }

        return ExecutionStateResolver.resolveContractToAddress(f, context);
      },
      accountRuntimeValue: (arv) => context.accounts[arv.accountIndex],
      moduleParameterRuntimeValue: (mprv) => {
        const moduleParameters = context.deploymentParameters[mprv.moduleId];

        if (moduleParameters === undefined) {
          if (mprv.defaultValue === undefined) {
            throw new IgnitionError(
              `No default value provided for module parameter ${mprv.moduleId}/${mprv.name}`
            );
          }

          return mprv.defaultValue;
        }

        const parameter = moduleParameters[mprv.name];

        if (parameter === undefined) {
          if (mprv.defaultValue === undefined) {
            throw new IgnitionError(
              `No default value provided for module parameter ${mprv.moduleId}/${mprv.name}`
            );
          }

          return mprv.defaultValue;
        }

        return parameter;
      },
    }) as ArgumentType[];
  }

  // Library addresses are resolved from previous execution states
  public static resolveLibrariesFromExecutionState(
    libraries: Record<string, ContractFuture<string>>,
    { executionStateMap }: ReconciliationContext
  ): Record<string, string | undefined> {
    return Object.fromEntries(
      Object.entries(libraries).map(([key, libFuture]) => {
        const executionStateEntry = executionStateMap[
          libFuture.id
        ] as DeploymentExecutionState;

        return [key, executionStateEntry?.contractAddress];
      })
    );
  }

  public static resolveContractToAddress(
    address: string | ContractFuture<string>,
    { executionStateMap }: ReconciliationContext
  ): string {
    if (typeof address === "string") {
      return address;
    }

    const contractAddress = this.resolveFromExecutionState(
      address,
      executionStateMap,
      (exState: DeploymentExecutionState) => exState.contractAddress
    );

    if (contractAddress === undefined) {
      throw new IgnitionError("Previous deployment without contractAddress");
    }

    if (!isAddress(contractAddress)) {
      throw new IgnitionError("contractAddress is not a usable address");
    }

    return contractAddress;
  }

  public static resolveToAddress(
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    context: ReconciliationContext
  ): string {
    if (typeof address === "string") {
      return address;
    }

    if (isRuntimeValue(address)) {
      const runtimeValue = resolveModuleParameter(address, context);

      if (typeof runtimeValue !== "string" || !isAddress(runtimeValue)) {
        throw new IgnitionError(
          `Address runtime value is not a usable address ${safeToString(
            runtimeValue
          )}`
        );
      }

      return runtimeValue;
    }

    const result = this.resolveFromExecutionState(
      address,
      context.executionStateMap,
      (executionState: StaticCallExecutionState) => executionState.result
    );

    if (typeof result !== "string" || !isAddress(result)) {
      throw new IgnitionError("Result is not a usable address");
    }

    return result;
  }

  public static resolveSendDataToAddress(
    toAddress:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    context: ReconciliationContext
  ): string {
    if (typeof toAddress === "string") {
      return toAddress;
    }

    if (isRuntimeValue(toAddress)) {
      const runtimeValue = resolveModuleParameter(toAddress, context);

      if (typeof runtimeValue !== "string" || !isAddress(runtimeValue)) {
        throw new IgnitionError(
          `To runtime value is not a usable address ${safeToString(
            runtimeValue
          )}`
        );
      }

      return runtimeValue;
    }

    const to = this.resolveFromExecutionState(
      toAddress,
      context.executionStateMap,
      (executionState: SendDataExecutionState) => executionState.to
    );

    if (typeof to !== "string" || !isAddress(to)) {
      throw new IgnitionError("To is not a usable address");
    }

    return to;
  }

  public static resolveFromExecutionState<
    TFuture extends Future,
    TExState extends ExecutionState,
    TResult extends TExState[keyof TExState]
  >(
    future: TFuture,
    executionStateMap: ExecutionStateMap,
    func: (exe: TExState) => TResult
  ): TResult {
    const executionState = executionStateMap[future.id] as TExState;

    if (executionState === undefined) {
      throw new IgnitionError("Failure looking up execution state");
    }

    if (future.type !== executionState.futureType) {
      throw new IgnitionError("Execution state type does not match future");
    }

    return func(executionState);
  }
}
