import { CompilationJob } from "../../../builtin-tasks/types";
import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromCompilationJob(
  compilationJob: CompilationJob
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of compilationJob.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content.rawContent,
    };
  }

  const { settings } = compilationJob.getSolcConfig();

  const input: SolcInput = {
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
