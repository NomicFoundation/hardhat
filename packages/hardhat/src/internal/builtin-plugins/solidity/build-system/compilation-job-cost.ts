import type { CompilationJob } from "../../../../types/solidity.js";

// This doesn't need to be exact, it's used to account for the per-file
// overhead, so that many small files don't look free
const APPROXIMATE_AVERAGE_SIZE_OF_SOLIDITY_FILES = 10_000;

export function estimateCompilationJobCost(job: CompilationJob): number {
  let totalBytes = 0;
  let fileCount = 0;

  for (const file of job.dependencyGraph.getAllFiles()) {
    totalBytes += file.content.text.length;
    fileCount += 1;
  }

  const settings = job.solcConfig.settings ?? {};
  const viaIR = settings.viaIR === true;
  const optimizerEnabled = settings.optimizer?.enabled === true;
  const optimizerRuns: number = settings.optimizer?.runs ?? 200; // default is 200

  const viaIRMultiplier = viaIR === true ? 6.0 : 1.0;
  const optimizerMultiplier = optimizerEnabled ? 1.4 : 1.0;

  // The optimizer `runs` is not the number of times that the optimizer is run.
  // It represents how many times the contract will be run.
  // While it has an effect in the compilation time, it's not linear nor
  // dominant.
  //
  // We use Math.log10 and Math.min to represent that:
  //   - increasing runs probably has diminishing impact in cost
  //   - going from 1 -> 200 matters more than 200 -> 20_000
  //   - runs should contribute weakly compared with viaIR
  const runsMultiplier = optimizerEnabled
    ? 1 + Math.min(0.12, Math.log10(Math.max(1, optimizerRuns)) * 0.04)
    : 1.0;

  const fileOverhead = APPROXIMATE_AVERAGE_SIZE_OF_SOLIDITY_FILES * fileCount;

  return (
    (totalBytes + fileOverhead) *
    viaIRMultiplier *
    optimizerMultiplier *
    runsMultiplier
  );
}

/**
 * Returns a new array containing the given compilation jobs sorted by their
 * estimated cost in descending order. The input array is not mutated.
 */
export function sortCompilationJobsByDescendingCost(
  compilationJobs: CompilationJob[],
): CompilationJob[] {
  return compilationJobs
    .map((job) => ({ job, cost: estimateCompilationJobCost(job) }))
    .sort((a, b) => b.cost - a.cost)
    .map(({ job }) => job);
}
