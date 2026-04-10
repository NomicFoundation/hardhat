import type { CompilerInput } from "./compiler-io.js";
import type { DependencyGraph } from "./dependency-graph.js";
import type { ToolVersions } from "./solidity-artifacts.js";
import type { SolidityCompilerConfig } from "../config.js";

/**
 * A compilation job to be run.
 */
export interface CompilationJob {
  /**
   * The dependency graph of the compilation job, whose root files' artifacts
   * will be emitted.
   */
  dependencyGraph: DependencyGraph;

  /**
   * The compiler config to use.
   */
  solcConfig: SolidityCompilerConfig;

  /**
   * The long version of the compiler to be used.
   */
  solcLongVersion: string;

  /**
   * The versions to include in the build info, if any.
   * When present, these versions influence the build id.
   */
  toolVersions?: ToolVersions;

  /**
   * Returns the solc input to be used.
   */
  getSolcInput(): Promise<CompilerInput>;

  /**
   * Returns the build id of the compilation job.
   *
   * The id is guaranteed to be deterministically generated based on the solc
   * input that this compilation job would generate, the solc long version,
   * and the current solidity build info format that Hardhat uses.
   *
   * While deterministic, it shouldn't be expected to be stable across different
   * versions of Hardhat.
   */
  getBuildId(): Promise<string>;
}
