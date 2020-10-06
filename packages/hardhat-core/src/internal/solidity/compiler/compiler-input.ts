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

  const input: CompilerInput = {
    language: "Solidity",
    sources,
    settings: {
      ...settings,
    },
  };

  return input;
}
