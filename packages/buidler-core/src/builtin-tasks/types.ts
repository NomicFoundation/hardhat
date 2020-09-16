import { ResolvedFile } from "../internal/solidity/resolver";
import { SolcConfig } from "../types";

export interface CompilationJob {
  emitsArtifacts(file: ResolvedFile): boolean;
  hasSolc9573Bug(): boolean;
  merge(other: CompilationJob): CompilationJob;
  getResolvedFiles(): ResolvedFile[];
  getSolcConfig(): SolcConfig;
}

export interface DependencyGraph {
  getConnectedComponents(): DependencyGraph[];
  getDependencies(file: ResolvedFile): ResolvedFile[];
  getResolvedFiles(): ResolvedFile[];
  getTransitiveDependencies(file: ResolvedFile): ResolvedFile[];
}
