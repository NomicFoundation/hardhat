import semver from "semver";

import { SUPPORTED_NODE_VERSIONS } from "./constants";

/**
 * Determine if the node version is unsupported by Hardhat
 * and so a warning message should be shown.
 *
 * The current rule is that Hardhat supports all `Current`,
 * `Active LTS`, and `Maintenance LTS` versions of Node.js
 * as defined in the Node.js release schedule and encoded
 * in the `SUPPORTED_NODE_VERSIONS` constant.
 */
export function isNodeVersionToWarnOn(nodeVersion: string): boolean {
  return !semver.satisfies(nodeVersion, SUPPORTED_NODE_VERSIONS.join(" || "));
}
