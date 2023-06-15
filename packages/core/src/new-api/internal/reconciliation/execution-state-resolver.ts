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
import { assertIgnitionInvariant } from "../utils/assertions";
import { replaceWithinArg } from "../utils/replace-within-arg";

import { ReconciliationContext } from "./types";
import { resolveModuleParameter, safeToString } from "./utils";

// TODO: consider merging this into the execution state map
export class ExecutionStateResolver {
  public static resolveArgsFromExectuionState(
    constructorArgs: ArgumentType[],
    context: ReconciliationContext
  ): ArgumentType[] {
    const replace = (arg: ArgumentType) =>
      replaceWithinArg<ArgumentType>(arg, {
        bigint: (bi) => bi.toString(),
        future: (f) => {
          if (!isContractFuture(f)) {
            throw new IgnitionError(
              `Only deployable contract and library futures can be used in args, ${f.id} is not a contract or library future`
            );
          }

          return ExecutionStateResolver.resolveContractToAddress(f, context);
        },
        accountRuntimeValue: (arv) => context.accounts[arv.accountIndex],
        moduleParameterRuntimeValue: (mprv) => {
          return resolveModuleParameter(mprv, context);
        },
      });

    return constructorArgs.map(replace);
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

    assertIgnitionInvariant(
      contractAddress !== undefined,
      "Previous deployment without contractAddress"
    );
    assertIgnitionInvariant(
      isAddress(contractAddress),
      "contractAddress is not a usable address"
    );

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
          `Module parameter ${address.moduleId}/${
            address.name
          } is not a usable address ${safeToString(runtimeValue)}`
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
      throw new IgnitionError("Static call result is not a usable address");
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
