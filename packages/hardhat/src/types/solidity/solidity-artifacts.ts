import type { CompilerInput, CompilerOutput } from "./compiler-io.js";

/**
 * A record with the versions of the different tools used to create a
 * build info.
 */
export interface ToolVersions {
  readonly hardhat: string;
}

/**
 * A SolidityBuildInfo is a file that contains all the information of a solc
 * run. It includes all the necessary information to recreate that exact same
 * run, and all of its output.
 */
export interface SolidityBuildInfo {
  /**
   * The version identifier of this format.
   */
  readonly _format: "hh3-sol-build-info-1";

  /**
   * The id of the build, which is derived from the rest of the data,
   * guaranteeing that it's unique and deterministic.
   *
   * When `compilerType` is present and is not "solc", the format is:
   *   `solc-<major>_<minor>_<patch>-<compiler-type>-<job-hash>`
   *
   * Otherwise (i.e. solc or undefined), the format is:
   *   `solc-<major>_<minor>_<patch>-<job-hash>`
   */
  readonly id: string;

  /**
   * The solc version used to compile the build.
   */
  readonly solcVersion: string;

  /**
   * The long solc version used to compile the build.
   */
  readonly solcLongVersion: string;

  /**
   * The compiler type used for this build. If absent or undefined, it means
   * "solc" was used.
   *
   * Note: This is typed as `string` rather than `SolidityCompilerType` because
   * the build info may come from a different Hardhat setup where the compiler
   * type may not be registered in the current type definitions.
   */
  readonly compilerType?: string;

  /**
   * Versions of the different tools used to create this build info.
   *
   * Not present if the build profile used to create this build info
   * had `toolVersionsInBuildInfo` as `false`.
   */
  readonly toolVersions?: ToolVersions;

  /**
   * A mapping from user source names to input source names, for the root
   * files of the build (i.e. the files whose artifacts where being compiled).
   *
   * A user source name is the source name used by the user, for example, to
   * refer to artifacts. While an input source name is the source name used by
   * solc.
   */
  readonly userSourceNameMap: Record<string, string>;

  /**
   * The compiler input, as provided to solc.
   */
  readonly input: CompilerInput;
}

/**
 * The output of compiling a Solidity build info.
 */
export interface SolidityBuildInfoOutput {
  /**
   * The version identifier of this format.
   */
  readonly _format: "hh3-sol-build-info-output-1";

  /**
   * The id of the SolidityBuildInfo.
   */
  readonly id: string;

  /**
   * The `solc` output, verbatim (i.e. as returned by `solc`).
   */
  readonly output: CompilerOutput;
}
