import type { DeploymentParameters } from "../../../../types/deploy.js";
import type {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  EncodeFunctionCallFuture,
  Future,
  ModuleParameterRuntimeValue,
  ReadEventArgumentFuture,
  SolidityParameterType,
  StaticCallFuture,
} from "../../../../types/module.js";
import type { DeploymentLoader } from "../../../deployment-loader/types.js";
import type { DeploymentState } from "../../types/deployment-state.js";

import { isAddress } from "ethers/address";

import {
  isAccountRuntimeValue,
  isFuture,
  isModuleParameterRuntimeValue,
} from "../../../../type-guards.js";
import { assertIgnitionInvariant } from "../../../utils/assertions.js";
import { replaceWithinArg } from "../../../utils/replace-within-arg.js";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter.js";
import { findAddressForContractFuture } from "../../../views/find-address-for-contract-future-by-id.js";
import { findConfirmedTransactionByFutureId } from "../../../views/find-confirmed-transaction-by-future-id.js";
import { findResultForFutureById } from "../../../views/find-result-for-future-by-id.js";
import { getEventArgumentFromReceipt } from "../../abi.js";
import { convertEvmValueToSolidityParam } from "../../utils/convert-evm-tuple-to-solidity-param.js";

/**
 * Resolve a futures value to a bigint.
 *
 * @param givenValue - either a bigint or a module parameter runtime value
 * @param deploymentParameters - the user provided deployment parameters
 * @returns the resolved bigint
 */
export function resolveValue(
  givenValue:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture,
  deploymentParameters: DeploymentParameters,
  deploymentState: DeploymentState,
  accounts: string[],
): bigint {
  if (typeof givenValue === "bigint") {
    return givenValue;
  }

  let result: SolidityParameterType;
  if (isFuture(givenValue)) {
    result = findResultForFutureById(deploymentState, givenValue.id);
  } else {
    result = resolveModuleParameter(givenValue, {
      deploymentParameters,
      accounts,
    });
  }

  assertIgnitionInvariant(
    typeof result === "bigint",
    "Module parameter or future result used as value must be a bigint",
  );

  return result;
}

/**
 * Recursively resolve an arguments array, replacing any runtime values
 * or futures with their resolved values.
 */
export function resolveArgs(
  args: ArgumentType[],
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
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
        return resolveModuleParameter(mprv, {
          deploymentParameters,
          accounts,
        });
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
  accounts: string[],
  defaultSender: string,
): string {
  if (from === undefined) {
    return defaultSender;
  }

  if (typeof from === "string") {
    return from;
  }

  return resolveAccountRuntimeValue(from, accounts);
}

/**
 * Resolve a `send` future's data parameter to a string.
 */
export function resolveFutureData(
  data: string | EncodeFunctionCallFuture<string, string> | undefined,
  deploymentState: DeploymentState,
): string {
  if (data === undefined) {
    return "0x";
  }

  if (typeof data === "string") {
    return data;
  }

  const result = findResultForFutureById(deploymentState, data.id);

  assertIgnitionInvariant(
    typeof result === "string",
    "Expected future data to be a string",
  );

  return result;
}

/**
 * Resolves an account runtime value to an address.
 */
export function resolveAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[],
): string {
  const address = accounts[arv.accountIndex];
  assertIgnitionInvariant(
    address !== undefined,
    `Account ${arv.accountIndex} not found`,
  );

  return address;
}

/**
 * Resolve a futures dependent libraries to a map of library names to addresses.
 */
export function resolveLibraries(
  libraries: Record<string, ContractFuture<string>>,
  deploymentState: DeploymentState,
): { [libName: string]: string } {
  return Object.fromEntries(
    Object.entries(libraries).map(([key, lib]) => [
      key,
      findAddressForContractFuture(deploymentState, lib.id),
    ]),
  );
}

/**
 * Resolve a contract future down to the address it is deployed at.
 */
export function resolveAddressForContractFuture(
  contract: ContractFuture<string>,
  deploymentState: DeploymentState,
): string {
  return findAddressForContractFuture(deploymentState, contract.id);
}

/**
 * Resolve a SendDataFuture's "to" field to a valid ethereum address.
 */
export function resolveSendToAddress(
  to:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>
    | AccountRuntimeValue,
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
): string {
  if (typeof to === "string") {
    return to;
  }

  if (isAccountRuntimeValue(to)) {
    return resolveAccountRuntimeValue(to, accounts);
  }

  return resolveAddressLike(
    to,
    deploymentState,
    deploymentParameters,
    accounts,
  );
}

/**
 * Resolve the given address like to a valid ethereum address. Futures
 * will be resolved to their result then runtime checked to ensure
 * they are a valid address.
 */
export function resolveAddressLike(
  addressLike:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>,
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
): string {
  if (typeof addressLike === "string") {
    return addressLike;
  }

  if (isModuleParameterRuntimeValue(addressLike)) {
    const addressFromParam = resolveModuleParameter(addressLike, {
      deploymentParameters,
      accounts,
    });

    assertIgnitionInvariant(
      typeof addressFromParam === "string",
      "Module parameter used as address must be a string",
    );

    return addressFromParam;
  }

  const result = findResultForFutureById(deploymentState, addressLike.id);

  assertIgnitionInvariant(
    typeof result === "string" && isAddress(result),
    `Future '${addressLike.id}' must be a valid address`,
  );

  return result;
}

/**
 * Resolves a read event argument result to a SolidityParameterType.
 */
export async function resolveReadEventArgumentResult(
  future: Future,
  emitter: ContractFuture<string>,
  eventName: string,
  eventIndex: number,
  nameOrIndex: string | number,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader,
): Promise<{
  result: SolidityParameterType;
  emitterAddress: string;
  txToReadFrom: string;
}> {
  const emitterAddress = resolveAddressForContractFuture(
    emitter,
    deploymentState,
  );

  const emitterArtifact = await deploymentLoader.loadArtifact(emitter.id);

  const confirmedTx = findConfirmedTransactionByFutureId(
    deploymentState,
    future.id,
  );

  const evmValue = getEventArgumentFromReceipt(
    confirmedTx.receipt,
    emitterArtifact,
    emitterAddress,
    eventName,
    eventIndex,
    nameOrIndex,
  );

  return {
    result: convertEvmValueToSolidityParam(evmValue),
    emitterAddress,
    txToReadFrom: confirmedTx.hash,
  };
}

export async function resolveEncodeFunctionCallResult(
  artifactId: string,
  functionName: string,
  args: SolidityParameterType[],
  deploymentLoader: DeploymentLoader,
): Promise<string> {
  const artifact = await deploymentLoader.loadArtifact(artifactId);

  const { Interface } = await import("ethers");
  const iface = new Interface(artifact.abi);

  return iface.encodeFunctionData(functionName, args);
}
