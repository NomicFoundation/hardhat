import { CompilationJob, CompilerInput } from "../../../types";

export function getInputFromCompilationJob(
  compilationJob: CompilationJob
): CompilerInput {
  const sources: { [sourceName: string]: { content: string } } = {};
  for (const file of compilationJob.getResolvedFiles()) {
    sources[file.sourceName] = {
      content: file.content.rawContent,
    };
  }

  const { settings } = compilationJob.getSolcConfig();

  return {
    language: "Solidity",
    sources,
    settings,
  };
}
