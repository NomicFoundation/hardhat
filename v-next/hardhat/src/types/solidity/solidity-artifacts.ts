import type { CompilerInput, CompilerOutput } from "./compiler-io.js";

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
   * guaranteing that it's unique and deterministic.
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
