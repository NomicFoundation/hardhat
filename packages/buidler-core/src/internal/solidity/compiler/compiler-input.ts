import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { CompilationGroup } from "../compilationGroup";
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
  compilationGroup: CompilationGroup
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of compilationGroup.getFilesToCompile()) {
    sources[file.globalName] = {
      content: file.content.rawContent,
    };
  }

  const { optimizer, evmVersion } = compilationGroup.solidityConfig;

  const input: SolcInput = {
    language: "Solidity",
    sources,
    settings: {
      metadata: {
        useLiteralContent: true,
      },
      optimizer,
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
