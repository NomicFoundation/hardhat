import { SolcInput, SolcOptimizerConfig, EVMVersion, SolcSettings } from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

export function getInputFromDependencyGraph(
  graph: DependencyGraph,
  config: {
    optimizer: SolcOptimizerConfig;
    evmVersion?: EVMVersion;
    solcSettings?: SolcSettings
  }
): SolcInput {
  const {optimizer, evmVersion, solcSettings} = config;
  const sources: { [globalName: string]: { content: string } } = {};
  for (const file of graph.getResolvedFiles()) {
    sources[file.globalName] = {
      content: file.content
    };
  }

  const input: SolcInput = {
    language: "Solidity",
    sources,
    settings: <SolcSettings> solcSettings ? JSON.parse(JSON.stringify(solcSettings)) : {
      optimizer: optimizer,
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

  // ENSURE SOLC SETTINGS ARE SUFFICIENT FOR BUIDLER :
  if (!input.settings.outputSelection) {
    input.settings.outputSelection = {
      "*": {
        "*": [],
        "": []
      }
    };
  }
  if (!input.settings.outputSelection["*"]) {
    input.settings.outputSelection["*"]= {
      "*": [],
      "": []
    }
  }
  if (!input.settings.outputSelection["*"]["*"]) {
    input.settings.outputSelection["*"]["*"] = [];
  }
  if (!input.settings.outputSelection["*"][""]) {
    input.settings.outputSelection["*"][""] = [];
  }
  function addIfNotPresent(array : string[], value: string) {
    if (array.indexOf(value) === -1) {
      array.push(value);
    }
  }
  addIfNotPresent(input.settings.outputSelection["*"]["*"], "abi");
  addIfNotPresent(input.settings.outputSelection["*"]["*"], "evm.bytecode");
  addIfNotPresent(input.settings.outputSelection["*"]["*"], "evm.deployedBytecode");
  addIfNotPresent(input.settings.outputSelection["*"]["*"], "evm.methodIdentifiers");
  addIfNotPresent(input.settings.outputSelection["*"][""], "id");
  addIfNotPresent(input.settings.outputSelection["*"][""], "ast");


  // ALLOW OLD CONFIG TO STILL WORK AS OVERRIDE
  if (optimizer) {
    input.settings.optimizer = optimizer;
  }

  if (evmVersion !== undefined) {
    input.settings.evmVersion = evmVersion;
  }

  return input;
}
