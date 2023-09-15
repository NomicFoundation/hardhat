/**
 * The seperator in ids that indicated before as the module id and after
 * as the parts making up the particular future.
 */
const MODULE_SEPERATOR = "#";

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
  contractName: string,
  functionName: string
) {
  const futureKey =
    userProvidedId ?? `${contractName}${SUBKEY_SEPERATOR}${functionName}`;

  return `${moduleId}${MODULE_SEPERATOR}${futureKey}`;
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
