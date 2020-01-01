import fsExtra from "fs-extra";
import * as path from "path";

import { SolcInput, SolcOptimizerConfig } from "../../../types";
import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
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

export async function saveSolcInput(targetPath: string, input: SolcInput) {
  await fsExtra.ensureDir(targetPath);
  await fsExtra.writeJSON(path.join(targetPath, "SolcInput.json"), input, {
    spaces: 2
  });
}

export async function loadSolcInput(targetPath: string): Promise<SolcInput> {
  const solcInputPath = path.join(targetPath, "SolcInput.json");

  if (!fsExtra.pathExistsSync(targetPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND);
  }

  return fsExtra.readJson(solcInputPath);
}
