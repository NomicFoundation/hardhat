import { readdir, pathExists } from "fs-extra";

/**
 * Return a list of all deployments in the deployment directory.
 *
 * @param deploymentDir - the directory of the deployments
 *
 * @beta
 */
export async function listDeployments(
  deploymentDir: string
): Promise<string[]> {
  if (!(await pathExists(deploymentDir))) {
    return [];
  }

  return readdir(deploymentDir);
}
