/**
 * The seperator in ids that indicated before as the module id and after
 * as the parts making up the particular future.
 */
const MODULE_SEPERATOR = "#";

/**
 * The separator in ids that depend on futures that belong to a submodule.
 * This separator is used to split the submodule and the rest of the dependency's id.
 */
const SUBMODULE_SEPARATOR = "~";

/**
 * The seperator in ids that indicated different subparts of the future key.
 */
const SUBKEY_SEPERATOR = ".";

/**
 * Construct the future id for a contract or library deployment, namespaced by the
 * moduleId.
 *
 * @param moduleId - the id of the module the future is part of
 * @param userProvidedId - the overriding id provided by the user (it will still
 * be namespaced)
 * @param contractOrLibraryName - the contract or library name as a fallback
 * @returns the future id
 */
export function toDeploymentFutureId(
  moduleId: string,
  userProvidedId: string | undefined,
  contractOrLibraryName: string
) {
  return `${moduleId}${MODULE_SEPERATOR}${
    userProvidedId ?? contractOrLibraryName
  }`;
}

/**
 * Construct the future id for a call or static call, namespaced by the moduleId.
 *
 * @param moduleId - the id of the module the future is part of
 * @param userProvidedId - the overriding id provided by the user (it will still
 * be namespaced)
 * @param contractName - the contract or library name that forms part of the
 * fallback
 * @param functionName - the function name that forms part of the fallback
 * @returns the future id
 */
export function toCallFutureId(
  moduleId: string,
  userProvidedId: string | undefined,
  contractModuleId: string,
  contractId: string,
  functionName: string
) {
  if (userProvidedId !== undefined) {
    return `${moduleId}${MODULE_SEPERATOR}${userProvidedId}`;
  }

  // If the contract belongs to the call's module, we just need to add the function name
  if (moduleId === contractModuleId) {
    return `${contractId}${SUBKEY_SEPERATOR}${functionName}`;
  }

  // We replace the MODULE_SEPARATOR for SUBMODULE_SEPARATOR
  const submoduleContractId = `${contractModuleId}${SUBMODULE_SEPARATOR}${contractId.substring(
    contractModuleId.length + MODULE_SEPERATOR.length
  )}`;

  return `${moduleId}${MODULE_SEPERATOR}${submoduleContractId}${SUBKEY_SEPERATOR}${functionName}`;
}

/**
 * Construct the future id for a read event argument future, namespaced by
 * the moduleId.
 *
 * @param moduleId - the id of the module the future is part of
 * @param userProvidedId - the overriding id provided by the user (it will still
 * be namespaced)
 * @param contractName - the contract or library name that forms part of the
 * fallback
 * @param eventName - the event name that forms part of the fallback
 * @param nameOrIndex - the argument name or argumentindex that forms part
 * of the fallback
 * @param eventIndex - the event index that forms part of the fallback
 * @returns the future id
 */
export function toReadEventArgumentFutureId(
  moduleId: string,
  userProvidedId: string | undefined,
  contractName: string,
  eventName: string,
  nameOrIndex: string | number,
  eventIndex: number
) {
  const futureKey =
    userProvidedId ??
    `${contractName}${SUBKEY_SEPERATOR}${eventName}${SUBKEY_SEPERATOR}${nameOrIndex}${SUBKEY_SEPERATOR}${eventIndex}`;

  return `${moduleId}${MODULE_SEPERATOR}${futureKey}`;
}

/**
 * Construct the future id for a send data future, namespaced by the moduleId.
 *
 * @param moduleId - the id of the module the future is part of
 * @param userProvidedId - the overriding id provided by the user (it will still
 * be namespaced)
 * @returns the future id
 */
export function toSendDataFutureId(moduleId: string, userProvidedId: string) {
  return `${moduleId}${MODULE_SEPERATOR}${userProvidedId}`;
}
