import {
  EVMVersion,
  SolcInput,
  SolcOptimizerConfig,
  SolcSettings
} from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromDependencyGraph(
  graph: DependencyGraph,
  config: {
    optimizer: SolcOptimizerConfig;
    evmVersion?: EVMVersion;
    outputMetadata?: boolean | { useLiteralContent: boolean };
    solcSettings?: SolcSettings;
  }
): SolcInput {
  const { optimizer, evmVersion, solcSettings, outputMetadata } = config;
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of graph.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content
    };
  }

  const settings =
    (solcSettings as SolcSettings) !== undefined
      ? JSON.parse(JSON.stringify(solcSettings))
      : {
          optimizer,
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
        };

  ensureMinimalSettingsForBuidler(settings);

  // override settings via solc top level settings
  if (outputMetadata !== undefined) {
    if (typeof outputMetadata !== "boolean") {
      settings.metadata = outputMetadata;
    }
    addIfNotPresent(settings.outputSelection["*"]["*"], "metadata");
  }

  if (optimizer !== undefined) {
    settings.optimizer = optimizer;
  }

  if (evmVersion !== undefined) {
    settings.evmVersion = evmVersion;
  }

  const input: SolcInput = {
    language: "Solidity",
    sources,
    settings
  };

  return input;
}

function addIfNotPresent(array: string[], value: string) {
  if (array.indexOf(value) === -1) {
    array.push(value);
  }
}

function ensureMinimalSettingsForBuidler(settings: SolcSettings): void {
  // ENSURE SOLC SETTINGS ARE SUFFICIENT FOR BUIDLER :
  if (settings.outputSelection === undefined) {
    settings.outputSelection = {
      "*": {
        "*": [],
        "": []
      }
    };
  }
  if (settings.outputSelection["*"] === undefined) {
    settings.outputSelection["*"] = {
      "*": [],
      "": []
    };
  }
  if (settings.outputSelection["*"]["*"] === undefined) {
    settings.outputSelection["*"]["*"] = [];
  }
  if (settings.outputSelection["*"][""] === undefined) {
    settings.outputSelection["*"][""] = [];
  }

  addIfNotPresent(settings.outputSelection["*"]["*"], "abi");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.bytecode");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.deployedBytecode");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.methodIdentifiers");
  addIfNotPresent(settings.outputSelection["*"][""], "id");
  addIfNotPresent(settings.outputSelection["*"][""], "ast");
}
