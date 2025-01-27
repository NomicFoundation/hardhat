import type { Artifact } from "./types/artifact";
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
} from "./types/module";

import { FutureType, RuntimeValueType } from "./types/module";

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
 * @beta
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
 * @beta
 */
export function isFutureType(potential: unknown): potential is FutureType {
  return (
    typeof potential === "string" && isValidEnumValue(FutureType, potential)
  );
}

/**
 * Returns true if potential is of type Future.
 *
 * @beta
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
 * @beta
 */
export function isContractFuture(
  future: Future,
): future is ContractFuture<string> {
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
 * @beta
 */
export function isCallableContractFuture(
  future: Future,
): future is CallableContractFuture<string> {
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
 * @beta
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
 * @beta
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
 * @beta
 */
export function isNamedStaticCallFuture(
  future: Future,
): future is StaticCallFuture<string, string> {
  return future.type === FutureType.STATIC_CALL;
}

/**
 * Returns true if future is of type EncodeFunctionCallFuture\<string, string\>.
 *
 * @beta
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
 * @beta
 */
export function isReadEventArgumentFuture(
  future: Future,
): future is ReadEventArgumentFuture {
  return future.type === FutureType.READ_EVENT_ARGUMENT;
}

/**
 * Returns true if future is of type NamedContractDeploymentFuture.
 *
 * @beta
 */
export function isNamedContractDeploymentFuture(
  future: Future,
): future is NamedArtifactContractDeploymentFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactContractDeploymentFuture.
 *
 * @beta
 */
export function isArtifactContractDeploymentFuture(
  future: Future,
): future is ContractDeploymentFuture {
  return future.type === FutureType.CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedLibraryDeploymentFuture.
 *
 * @beta
 */
export function isNamedLibraryDeploymentFuture(
  future: Future,
): future is NamedArtifactLibraryDeploymentFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactLibraryDeploymentFuture.
 *
 * @beta
 */
export function isArtifactLibraryDeploymentFuture(
  future: Future,
): future is LibraryDeploymentFuture {
  return future.type === FutureType.LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedContractAtFuture.
 *
 * @beta
 */
export function isNamedContractAtFuture(
  future: Future,
): future is NamedArtifactContractAtFuture<string> {
  return future.type === FutureType.NAMED_ARTIFACT_CONTRACT_AT;
}

/**
 * Returns true if future is of type ArtifactContractAtFuture.
 *
 * @beta
 */
export function isArtifactContractAtFuture(
  future: Future,
): future is ContractAtFuture {
  return future.type === FutureType.CONTRACT_AT;
}

/**
 * Returns true if the type is of type DeploymentFuture<string>.
 *
 * @beta
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
 * @beta
 */
export function isDeploymentFuture(
  future: Future,
): future is DeploymentFuture<string> {
  return isDeploymentType(future.type);
}

/**
 * Returns true if the future requires submitting a transaction on-chain
 *
 * @beta
 */
export function isFutureThatSubmitsOnchainTransaction(
  f: Future,
): f is Exclude<
  Exclude<
    Exclude<
      Exclude<Future, StaticCallFuture<string, string>>,
      ReadEventArgumentFuture
    >,
    NamedArtifactContractAtFuture<string>
  >,
  ContractAtFuture
> {
  return (
    !isNamedStaticCallFuture(f) &&
    !isReadEventArgumentFuture(f) &&
    !isNamedContractAtFuture(f) &&
    !isArtifactContractAtFuture(f)
  );
}

/**
 * Returns true if potential is of type RuntimeValueType.
 *
 * @beta
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
 * @beta
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
 * @beta
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
 * @beta
 */
export function isModuleParameterRuntimeValue(
  potential: unknown,
): potential is ModuleParameterRuntimeValue<any> {
  return (
    isRuntimeValue(potential) &&
    potential.type === RuntimeValueType.MODULE_PARAMETER
  );
}
