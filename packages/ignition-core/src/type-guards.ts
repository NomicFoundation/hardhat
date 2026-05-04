import type { Artifact } from "./types/artifact.js";
import type {
  AccountRuntimeValue,
  AddressResolvableFuture,
  CallableContractFuture,
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
  DeploymentFuture,
  EncodeFunctionCallFuture,
  FunctionCallFuture,
  Future,
  LibraryDeploymentFuture,
  ModuleParameterRuntimeValue,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  ReadEventArgumentFuture,
  RuntimeValue,
  StaticCallFuture,
} from "./types/module.js";

import { FutureType, RuntimeValueType } from "./types/module.js";

function isValidEnumValue(
  theEnum: Record<string, string>,
  value: string,
): boolean {
  // Enums are objects that have entries that map:
  //   1) keys to values
  //   2) values to keys
  const key = theEnum[value];
  if (key === undefined) {
    return false;
  }

  return theEnum[key] === value;
}

/**
 * Returns true if potential is of type Artifact.
 *
 * @public
 */
export function isArtifactType(potential: unknown): potential is Artifact {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "contractName" in potential &&
    "bytecode" in potential &&
    "abi" in potential &&
    "linkReferences" in potential &&
    typeof potential.contractName === "string" &&
    typeof potential.bytecode === "string" &&
    Array.isArray(potential.abi) &&
    typeof potential.linkReferences === "object"
  );
}

/**
 * Returns true if potential is of type FutureType.
 *
 * @public
 */
export function isFutureType(potential: unknown): potential is FutureType {
  return (
    typeof potential === "string" && isValidEnumValue(FutureType, potential)
  );
}

/**
 * Returns true if potential is of type Future.
 *
 * @public
 */
export function isFuture(potential: unknown): potential is Future {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isFutureType(potential.type)
  );
}

/**
 * Returns true if future is of type ContractFuture<string>.
 *
 * @public
 */
export function isContractFuture(
  future: Future,
): future is ContractFuture<string> {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- The other case will return false
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT:
      return true;

    default:
      return false;
  }
}

/**
 * Returns true if future is of type CallableContractFuture<string>.
 *
 * @public
 */
export function isCallableContractFuture(
  future: Future,
): future is CallableContractFuture<string> {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- The other case will return false
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT:
      return true;

    default:
      return false;
  }
}

/**
 * Returns true if future is of type AddressResolvable.
 *
 * @public
 */
export function isAddressResolvableFuture(
  future: Future,
): future is AddressResolvableFuture {
  return (
    isContractFuture(future) ||
    future.type === FutureType.STATIC_CALL ||
    future.type === FutureType.READ_EVENT_ARGUMENT
  );
}

/**
 * Returns true if future is of type FunctionCallFuture\<string, string\>.
 *
 * @public
 */
export function isFunctionCallFuture(
  future: Future,
): future is FunctionCallFuture<string, string> {
  return (
    future.type === FutureType.CONTRACT_CALL ||
    future.type === FutureType.STATIC_CALL
  );
}

/**
 * Returns true if future is of type NamedStaticCallFuture.
 *
 * @public
 */
export function isNamedStaticCallFuture(
  future: Future,
): future is StaticCallFuture<string, string> {
  return future.type === FutureType.STATIC_CALL;
}

/**
 * Returns true if future is of type EncodeFunctionCallFuture\<string, string\>.
 *
 * @public
 */
export function isEncodeFunctionCallFuture(
  potential: unknown,
): potential is EncodeFunctionCallFuture<string, string> {
  return (
    isFuture(potential) && potential.type === FutureType.ENCODE_FUNCTION_CALL
  );
}

/**
 * Returns true if future is of type ReadEventArgumentFuture.
 *
 * @public
 */
export function isReadEventArgumentFuture(
  future: Future,
): future is ReadEventArgumentFuture {
  return future.type === FutureType.READ_EVENT_ARGUMENT;
}

/**
 * Returns true if future is of type NamedContractDeploymentFuture.
 *
 * @public
 */
export function isNamedContractDeploymentFuture(
  future: Future,
): future is NamedArtifactContractDeploymentFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactContractDeploymentFuture.
 *
 * @public
 */
export function isArtifactContractDeploymentFuture(
  future: Future,
): future is ContractDeploymentFuture {
  return future.type === FutureType.CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedLibraryDeploymentFuture.
 *
 * @public
 */
export function isNamedLibraryDeploymentFuture(
  future: Future,
): future is NamedArtifactLibraryDeploymentFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactLibraryDeploymentFuture.
 *
 * @public
 */
export function isArtifactLibraryDeploymentFuture(
  future: Future,
): future is LibraryDeploymentFuture {
  return future.type === FutureType.LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedContractAtFuture.
 *
 * @public
 */
export function isNamedContractAtFuture(
  future: Future,
): future is NamedArtifactContractAtFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_CONTRACT_AT;
}

/**
 * Returns true if future is of type ArtifactContractAtFuture.
 *
 * @public
 */
export function isArtifactContractAtFuture(
  future: Future,
): future is ContractAtFuture {
  return future.type === FutureType.CONTRACT_AT;
}

/**
 * Returns true if the type is of type DeploymentFuture<string>.
 *
 * @public
 */
export function isDeploymentType(
  potential: unknown,
): potential is DeploymentFuture<string>["type"] {
  const deploymentTypes = [
    FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.CONTRACT_DEPLOYMENT,
    FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
    FutureType.LIBRARY_DEPLOYMENT,
  ];

  return (
    typeof potential === "string" &&
    deploymentTypes.includes(potential as FutureType)
  );
}

/**
 * Returns true if future is of type DeploymentFuture<string>.
 *
 * @public
 */
export function isDeploymentFuture(
  future: Future,
): future is DeploymentFuture<string> {
  return isDeploymentType(future.type);
}

/**
 * Returns true if the future requires submitting a transaction on-chain
 *
 * @public
 */
export function isFutureThatSubmitsOnchainTransaction(
  f: Future,
): f is Exclude<
  Exclude<
    Exclude<
      Exclude<
        Exclude<Future, StaticCallFuture<string, string>>,
        ReadEventArgumentFuture
      >,
      NamedArtifactContractAtFuture<string>
    >,
    ContractAtFuture
  >,
  EncodeFunctionCallFuture<string, string>
> {
  return (
    !isNamedStaticCallFuture(f) &&
    !isReadEventArgumentFuture(f) &&
    !isNamedContractAtFuture(f) &&
    !isArtifactContractAtFuture(f) &&
    !isEncodeFunctionCallFuture(f)
  );
}

/**
 * Returns true if potential is of type RuntimeValueType.
 *
 * @public
 */
export function isRuntimeValueType(
  potential: unknown,
): potential is RuntimeValueType {
  return (
    typeof potential === "string" &&
    isValidEnumValue(RuntimeValueType, potential)
  );
}

/**
 * Returns true if potential is of type RuntimeValue.
 *
 * @public
 */
export function isRuntimeValue(potential: unknown): potential is RuntimeValue {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isRuntimeValueType(potential.type)
  );
}

/**
 * Return true if potential is an account runtime value.
 *
 * @public
 */
export function isAccountRuntimeValue(
  potential: unknown,
): potential is AccountRuntimeValue {
  return (
    isRuntimeValue(potential) && potential.type === RuntimeValueType.ACCOUNT
  );
}

/**
 * Returns true if potential is of type ModuleParameterRuntimeValue<any>.
 *
 * @public
 */
export function isModuleParameterRuntimeValue(
  potential: unknown,
): potential is ModuleParameterRuntimeValue<any> {
  return (
    isRuntimeValue(potential) &&
    potential.type === RuntimeValueType.MODULE_PARAMETER
  );
}
