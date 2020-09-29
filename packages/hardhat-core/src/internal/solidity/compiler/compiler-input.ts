import {
  CompilationJob,
  CompilerInput,
  SolcOptimizerConfig,
} from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

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
      metadata: {
        useLiteralContent: true,
      },
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
          ],
          "": ["id", "ast"],
        },
      },
      ...settings,
    },
  };

  return input;
}
