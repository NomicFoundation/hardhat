import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromDependencyGraph(
  graph: DependencyGraph,
  evmVersion: string,
  optimizerConfig: SolcOptimizerConfig
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of graph.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content
    };
  }

  return {
    language: "Solidity",
    sources,
    settings: {
      evmVersion,
      metadata: {
        useLiteralContent: true
      },
      optimizer: optimizerConfig,
      outputSelection: {
        "*": {
          "*": ["evm.bytecode.object", "abi"],
          "": ["ast"]
        }
      }
    }
  };
}
