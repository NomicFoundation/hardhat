import { exists, readdir } from "@ignored/hardhat-vnext-utils/fs";

/**
 * Return a list of all deployments in the deployment directory.
 *
 * @param deploymentDir - the directory of the deployments
 *
 * @beta
 */
export async function listDeployments(
  deploymentDir: string,
): Promise<string[]> {
  if (!(await exists(deploymentDir))) {
    return [];
  }

  return readdir(deploymentDir);
}
