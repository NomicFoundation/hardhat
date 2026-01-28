/**
 * Type extensions for the hardhat-exposed-example plugin.
 *
 * This module extends Hardhat's configuration types using TypeScript's
 * declaration merging. The pattern uses two interfaces:
 *
 * - `ProjectPathsUserConfig`: User-facing config where fields are optional
 * - `ProjectPathsConfig`: Resolved config where fields are required
 *
 * This ensures type safety: users can omit the field (defaults apply),
 * but after resolution the field is guaranteed to exist.
 */
import "hardhat/types/config";
declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    /**
     * Path to the directory where exposed contract wrappers will be generated.
     * Can be relative (resolved from project root) or absolute.
     * Defaults to "exposed-contracts".
     */
    exposedContracts?: string;
  }

  export interface ProjectPathsConfig {
    /**
     * Resolved absolute path to the exposed contracts directory.
     * Guaranteed to be set after config resolution.
     */
    exposedContracts: string;
  }
}
