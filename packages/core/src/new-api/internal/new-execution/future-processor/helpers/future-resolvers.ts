import { DeploymentParameters } from "../../../../types/deployer";
import {
  AccountRuntimeValue,
  ArgumentType,
  ContractFuture,
  ModuleParameterRuntimeValue,
  SolidityParameterType,
} from "../../../../types/module";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { replaceWithinArg } from "../../../utils/replace-within-arg";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter";
import { DeploymentState } from "../../types/deployment-state";
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
