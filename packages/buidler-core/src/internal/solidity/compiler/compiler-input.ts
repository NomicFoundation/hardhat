import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromDependencyGraph(
  graph: DependencyGraph,
  optimizerConfig: SolcOptimizerConfig,
  evmVersion?: string
): SolcInput {
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of graph.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content
    };
  }

  const input: SolcInput = {
    language: "Solidity",
    sources,
    settings: {
      metadata: {
        useLiteralContent: true
      },
      optimizer: optimizerConfig,
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers"
          ],
          "": ["id", "ast"]
        }
      }
    }
  };

  if (evmVersion !== undefined) {
    input.settings.evmVersion = evmVersion;
  }

  return input;
}
