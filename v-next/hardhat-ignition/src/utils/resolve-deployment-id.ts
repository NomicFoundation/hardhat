import { NomicLabsHardhatPluginError } from "@ignored/hardhat-vnext/plugins";

/**
 * A regex that captures Ignitions rules for deployment-ids, specifically
 * that they can only contain alphanumerics, dashes and underscores,
 * and that they start with a letter.
 */
const ignitionDeploymentIdRegex = /^[a-zA-Z][a-zA-Z0-9_\-]*$/;

/**
 * Determine the deploymentId, using either the user provided id,
 * throwing if it is invalid, or generating one from the chainId
 * if none was provided.
 *
 * @param givenDeploymentId - the user provided deploymentId if
 * they provided one undefined otherwise
 * @param chainId - the chainId of the network being deployed to
 *
 * @returns the deploymentId
 */
export function resolveDeploymentId(
  givenDeploymentId: string | undefined,
  chainId: number
) {
  if (
    givenDeploymentId !== undefined &&
    !_isValidDeploymentIdentifier(givenDeploymentId)
  ) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-ignition",
      `The deployment-id "${givenDeploymentId}" contains banned characters, ids can only contain alphanumerics, dashes or underscores`
    );
  }

  return givenDeploymentId ?? `chain-${chainId}`;
}

/**
 * Determine if the given identifier the rules for a valid deployment id.
 * */
export function _isValidDeploymentIdentifier(identifier: string): boolean {
  return ignitionDeploymentIdRegex.test(identifier);
}
