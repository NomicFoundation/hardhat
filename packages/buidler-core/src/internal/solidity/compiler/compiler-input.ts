import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { ICompilationGroup } from "../compilationGroup";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromDependencyGraph(
  graph: DependencyGraph,
  optimizerConfig: SolcOptimizerConfig,
  evmVersion?: string
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of graph.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content.rawContent,
    };
  }

  const input: SolcInput = {
    language: "Solidity",
    sources,
    settings: {
      metadata: {
        useLiteralContent: true,
      },
      optimizer: optimizerConfig,
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
    },
  };

  if (evmVersion !== undefined) {
    input.settings.evmVersion = evmVersion;
  }

  return input;
}

export function getInputFromCompilationGroup(
  compilationGroup: ICompilationGroup
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of compilationGroup.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content.rawContent,
    };
  }

  const { settings } = compilationGroup.getSolcConfig();

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
