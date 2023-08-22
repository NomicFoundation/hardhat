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
  Future,
  ModuleParameterRuntimeValue,
  SolidityParameterType,
} from "../../../../types/module";
import { DeploymentLoader } from "../../../deployment-loader/types";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { replaceWithinArg } from "../../../utils/replace-within-arg";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter";
import { getEventArgumentFromReceipt } from "../../abi";
import { DeploymentState } from "../../types/deployment-state";
import { ExecutionResultType } from "../../types/execution-result";
import { ExecutionSateType } from "../../types/execution-state";
import { convertEvmValueToSolidityParam } from "../../utils/convert-evm-tuple-to-solidity-param";
import { findAddressForContractFuture } from "../../views/find-address-for-contract-future-by-id";
import { findConfirmedTransactionByFutureId } from "../../views/find-confirmed-transaction-by-future-id";
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

/**
 * Resolve a contract future down to the address it is deployed at.
 */
export function resolveAddressForContractFuture(
  contract: ContractFuture<string>,
  deploymentState: DeploymentState
): string {
  return findAddressForContractFuture(deploymentState, contract.id);
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
  deploymentParameters: DeploymentParameters
): string {
  if (typeof addressLike === "string") {
    return addressLike;
  } else if (isModuleParameterRuntimeValue(addressLike)) {
    const addressFromParam = resolveModuleParameter(addressLike, {
      deploymentParameters,
    });

    assertIgnitionInvariant(
      typeof addressFromParam === "string",
      "Module parameter used as address must be a string"
    );

    return addressFromParam;
  } else if (isFuture(addressLike)) {
    const exState = deploymentState.executionStates[addressLike.id];

    if (exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE) {
      assertIgnitionInvariant(
        exState.result !== undefined &&
          exState.result.type === ExecutionResultType.SUCCESS,
        `Internal error - dependency ${addressLike.id} does not have a successful deployment result`
      );

      return exState.result.address;
    } else if (exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE) {
      const contractAddress = exState.contractAddress;

      assertIgnitionInvariant(
        contractAddress !== undefined,
        `Internal error - dependency ${addressLike.id} used before it's resolved`
      );

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${addressLike.id}' must be a valid address`
      );

      return contractAddress;
    } else if (
      exState.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE
    ) {
      const contractAddress = exState.result;

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${addressLike.id}' must be a valid address`
      );

      return contractAddress;
    } else if (exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE) {
      assertIgnitionInvariant(
        exState.result !== undefined &&
          exState.result.type === ExecutionResultType.SUCCESS,
        `Internal error - dependency ${addressLike.id} does not have a successful static call result`
      );

      const contractAddress = exState.result.value;

      assertIgnitionInvariant(
        typeof contractAddress === "string" && isAddress(contractAddress),
        `Future '${addressLike.id}' must be a valid address`
      );

      return contractAddress;
    } else {
      throw new IgnitionError(
        `Cannot resolve address of ${addressLike.id}, not an allowed future type ${addressLike.type}`
      );
    }
  } else {
    throw new IgnitionError(
      `Unable to resolve address of ${JSON.stringify(addressLike)}`
    );
  }
}

export function resolveTxHash(
  future: Future,
  deploymentState: DeploymentState
) {
  const confirmedTx = findConfirmedTransactionByFutureId(
    deploymentState,
    future.id
  );

  return confirmedTx.hash;
}

export async function resolveReadEventArgumentResult(
  future: Future,
  emitter: ContractFuture<string>,
  eventName: string,
  eventIndex: number,
  argumentName: string,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader
): Promise<{
  result: SolidityParameterType;
  emitterAddress: string;
  txToReadFrom: string;
}> {
  const emitterAddress = resolveAddressForContractFuture(
    emitter,
    deploymentState
  );

  const emitterArtifact = await deploymentLoader.loadArtifact(emitter.id);

  const confirmedTx = findConfirmedTransactionByFutureId(
    deploymentState,
    future.id
  );

  const evmValue = getEventArgumentFromReceipt(
    confirmedTx.receipt,
    emitterArtifact,
    emitterAddress,
    eventName,
    eventIndex,
    argumentName
  );

  return {
    result: convertEvmValueToSolidityParam(evmValue),
    emitterAddress,
    txToReadFrom: confirmedTx.hash,
  };
}
