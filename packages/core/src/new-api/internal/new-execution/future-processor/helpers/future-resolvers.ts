import { isAddress } from "ethers";

import { IgnitionError } from "../../../../../errors";
import {
  isFuture,
  isModuleParameterRuntimeValue,
} from "../../../../type-guards";
import { DeploymentParameters } from "../../../../types/deployer";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  ModuleParameterRuntimeValue,
  SolidityParameterType,
} from "../../../../types/module";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { replaceWithinArg } from "../../../utils/replace-within-arg";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter";
import { DeploymentState } from "../../types/deployment-state";
import { ExecutionResultType } from "../../types/execution-result";
import { ExecutionSateType } from "../../types/execution-state";
import { findAddressForContractFuture } from "../../views/find-address-for-contract-future-by-id";
import { findResultForFutureById } from "../../views/find-result-for-future-by-id";

/**
 * Resolve a futures value to a bigint.
 *
 * @param givenValue - either a bigint or a module parameter runtime value
 * @param deploymentParameters - the user provided deployment parameters
 * @returns the resolved bigint
 */
export function resolveValue(
  givenValue: bigint | ModuleParameterRuntimeValue<bigint>,
  deploymentParameters: DeploymentParameters
): bigint {
  if (typeof givenValue === "bigint") {
    return givenValue;
  }

  const moduleParam = resolveModuleParameter(givenValue, {
    deploymentParameters,
  });

  assertIgnitionInvariant(
    typeof moduleParam === "bigint",
    "Module parameter used as value must be a bigint"
  );

  return moduleParam;
}

/**
 * Recursively resolve an arguments array, replacing any runtime values
 * or futures with their resolved values.
 */
export function resolveArgs(
  args: ArgumentType[],
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): SolidityParameterType[] {
  const replace = (arg: ArgumentType) =>
    replaceWithinArg<SolidityParameterType>(arg, {
      bigint: (bi) => bi,
      future: (f) => {
        return findResultForFutureById(deploymentState, f.id);
      },
      accountRuntimeValue: (arv) => {
        return resolveAccountRuntimeValue(arv, accounts);
      },
      moduleParameterRuntimeValue: (mprv) => {
        return resolveModuleParameter(mprv, { deploymentParameters });
      },
    });

  return args.map(replace);
}

/**
 * Resolve a future's from field to either undefined (meaning defer until execution)
 * or a string address.
 */
export function resolveFutureFrom(
  from: string | AccountRuntimeValue | undefined,
  accounts: string[]
): string | undefined {
  if (from === undefined || typeof from === "string") {
    return from;
  }

  return resolveAccountRuntimeValue(from, accounts);
}

/**
 * Resolves an account runtime value to an address.
 */
export function resolveAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): string {
  const address = accounts[arv.accountIndex];
  assertIgnitionInvariant(
    address !== undefined,
    `Account ${arv.accountIndex} not found`
  );

  return address;
}

/**
 * Resolve a futures dependent libraries to a map of library names to addresses.
 */
export function resolveLibraries(
  libraries: Record<string, ContractFuture<string>>,
  deploymentState: DeploymentState
): { [libName: string]: string } {
  return Object.fromEntries(
    Object.entries(libraries).map(([key, lib]) => [
      key,
      findAddressForContractFuture(deploymentState, lib.id),
    ])
  );
}

export function resolveAddressForContract(
  contract: ContractFuture<string>,
  deploymentState: DeploymentState
): string {
  return findAddressForContractFuture(deploymentState, contract.id);
}

export function resolveAddressForContractAtAddress(
  contractAtAddress:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>,
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters
): string {
  if (typeof contractAtAddress === "string") {
    return contractAtAddress;
  } else if (isModuleParameterRuntimeValue(contractAtAddress)) {
    const addressFromParam = resolveModuleParameter(contractAtAddress, {
      deploymentParameters,
    });

    assertIgnitionInvariant(
      typeof addressFromParam === "string",
      "Module parameter used as address must be a string"
    );

    return addressFromParam;
  } else if (isFuture(contractAtAddress)) {
    const exState = deploymentState.executionStates[contractAtAddress.id];

    if (exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE) {
      assertIgnitionInvariant(
        exState.result !== undefined &&
          exState.result.type === ExecutionResultType.SUCCESS,
        `Internal error - dependency ${contractAtAddress.id} does not have a successful deployment result`
      );

      return exState.result.address;
    } else if (exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE) {
      const contractAddress = exState.contractAddress;

      assertIgnitionInvariant(
        contractAddress !== undefined,
        `Internal error - dependency ${contractAtAddress.id} used before it's resolved`
      );

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${contractAtAddress.id}' must be a valid address`
      );

      return contractAddress;
    } else if (
      exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE
    ) {
      const contractAddress = exState.result;

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${contractAtAddress.id}' must be a valid address`
      );

      return contractAddress;
    } else if (exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE) {
      assertIgnitionInvariant(
        exState.result !== undefined &&
          exState.result.type === ExecutionResultType.SUCCESS,
        `Internal error - dependency ${contractAtAddress.id} does not have a successful static call result`
      );

      const contractAddress = exState.result.value;

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${contractAtAddress.id}' must be a valid address`
      );

      return contractAddress;
    } else {
      throw new IgnitionError(
        `Cannot resolve address of ${contractAtAddress.id}, not an allowed future type ${contractAtAddress.type}`
      );
    }
  } else {
    throw new IgnitionError(
      `Unable to resolve address of ${JSON.stringify(contractAtAddress)}`
    );
  }
}
