import identity from "lodash/identity";

import { IgnitionError } from "../../../errors";
import {
  isContractFuture,
  isNamedStaticCallFuture,
  isReadEventArgumentFuture,
  isRuntimeValue,
} from "../../type-guards";
import {
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  Future,
  ModuleParameterRuntimeValue,
} from "../../types/module";
import { isOnchainInteractionMessage } from "../execution/guards";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStateMap,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";
import { isAddress } from "../utils";
import { assertIgnitionInvariant } from "../utils/assertions";
import { replaceWithinArg } from "../utils/replace-within-arg";
import { resolveModuleParameter } from "../utils/resolve-module-parameter";

import { ReconciliationContext } from "./types";
import { moduleParameterToErrorString } from "./utils";

// TODO: consider merging this into the execution state map
export class ExecutionStateResolver {
  public static resolveArgsFromExectuionState(
    constructorArgs: ArgumentType[],
    context: ReconciliationContext
  ): ArgumentType[] {
    const replace = (arg: ArgumentType) =>
      replaceWithinArg<ArgumentType>(arg, {
        bigint: identity,
        future: (f) => {
          if (isContractFuture(f)) {
            return this.resolveContractAddressToAddress(f, context);
          }

          if (isNamedStaticCallFuture(f)) {
            const result = this._resolveFromExecutionState(
              f,
              context.executionStateMap,
              (exe: StaticCallExecutionState) => exe.result
            );

            assertIgnitionInvariant(
              result !== undefined,
              "Static call result cannot be undefined"
            );

            return result;
          }

          if (isReadEventArgumentFuture(f)) {
            const result = this._resolveFromExecutionState(
              f,
              context.executionStateMap,
              (exe: ReadEventArgumentExecutionState) => exe.result
            );

            assertIgnitionInvariant(
              result !== undefined,
              "Read event argument result cannot be undefined"
            );

            return result;
          }

          throw new IgnitionError(
            `Only futures that resolve to a value can be used in args,` +
              ` ${f.id} is not a contract, library,` +
              ` static call or event argument future`
          );
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
        const contractAddress = this._resolveFromExecutionState(
          libFuture,
          executionStateMap,
          (exState: DeploymentExecutionState) => exState.contractAddress
        );

        return [key, contractAddress];
      })
    );
  }

  public static resolveContractAddressToAddress(
    address: string | ContractFuture<string>,
    { executionStateMap }: ReconciliationContext
  ): string {
    if (typeof address === "string") {
      return address;
    }

    const contractAddress = this._resolveFromExecutionState(
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

  public static resolveStaticCallResultToAddress(
    address:
      | string
      | ModuleParameterRuntimeValue<string>
      | AddressResolvableFuture,
    context: ReconciliationContext
  ): string {
    if (typeof address === "string") {
      return address;
    }

    if (isRuntimeValue(address)) {
      const runtimeValue = resolveModuleParameter(address, context);

      assertIgnitionInvariant(
        typeof runtimeValue === "string" && isAddress(runtimeValue),
        `Module parameter ${address.moduleId}/${
          address.name
        } is not a usable address ${moduleParameterToErrorString(runtimeValue)}`
      );

      return runtimeValue;
    }

    const result = this._resolveFromExecutionState(
      address,
      context.executionStateMap,
      (executionState: StaticCallExecutionState) => executionState.result
    );

    assertIgnitionInvariant(
      typeof result === "string" && isAddress(result),
      "Static call result is not a usable address"
    );

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
          `To runtime value is not a usable address ${moduleParameterToErrorString(
            runtimeValue
          )}`
        );
      }

      return runtimeValue;
    }

    const to = this._resolveFromExecutionState(
      toAddress,
      context.executionStateMap,
      (executionState: SendDataExecutionState) => executionState.to
    );

    if (typeof to !== "string" || !isAddress(to)) {
      throw new IgnitionError("To is not a usable address");
    }

    return to;
  }

  /**
   * Return the from, or if from is undefined return the first from based
   * on the onchain interactions, if there are no interactions return undefined.
   */
  public static resolveFromAddress(
    executionState:
      | DeploymentExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState
      | CallExecutionState
  ): string | undefined {
    if (executionState.from !== undefined) {
      return executionState.from;
    }

    const senders = executionState.history
      .filter(isOnchainInteractionMessage)
      .map((m) => m.from);

    if (senders.length > 0) {
      return senders[0];
    }

    return undefined;
  }

  private static _resolveFromExecutionState<
    TFuture extends Future,
    TExState extends ExecutionState,
    TResult extends TExState[keyof TExState]
  >(
    future: TFuture,
    executionStateMap: ExecutionStateMap,
    func: (exe: TExState) => TResult
  ): TResult {
    const executionState = executionStateMap[future.id] as TExState;

    assertIgnitionInvariant(
      executionState !== undefined,
      `Failure looking up execution state for future ${future.id}, there is no history of previous execution of this future`
    );
    assertIgnitionInvariant(
      future.type === executionState.futureType,
      `Execution state type does not match future for future ${future.id}`
    );

    return func(executionState);
  }
}
