import { HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT } from "./constants.js";

const PROJECT_INPUT_SOURCE_NAME_PREFIX = `${HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT}/`;

/**
 * Recovers the user-facing source name from a solc input source name by
 * stripping the Hardhat project prefix.
 *
 * Project files have an input source name like `project/contracts/Foo.sol`,
 * whereas the user writes paths — and config globs — against the
 * project-relative `contracts/Foo.sol`. npm package input source names
 * (`npm/<pkg>@<version>/...`) don't carry the project prefix and are returned
 * unchanged.
 */
export function toUserSourceName(inputSourceName: string): string {
  return inputSourceName.startsWith(PROJECT_INPUT_SOURCE_NAME_PREFIX)
    ? inputSourceName.slice(PROJECT_INPUT_SOURCE_NAME_PREFIX.length)
    : inputSourceName;
}
