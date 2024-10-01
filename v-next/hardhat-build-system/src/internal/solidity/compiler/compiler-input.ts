import type { CompilationJob, CompilerInput } from "../../types/index.js";

const defaultSolcOutputSelection = {
  "*": {
    "*": [
      "abi",
      "evm.bytecode",
      "evm.deployedBytecode",
      "evm.methodIdentifiers",
      "metadata",
    ],
    "": ["ast"],
  },
} as const;

export function getInputFromCompilationJob(
  compilationJob: CompilationJob,
): CompilerInput {
  const sources: { [sourceName: string]: { content: string } } = {};

  // we sort the files so that we always get the same compilation input
  const resolvedFiles = compilationJob
    .getResolvedFiles()
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName));

  for (const file of resolvedFiles) {
    sources[file.sourceName] = {
      content: file.content.rawContent,
    };
  }

  const { settings } = compilationJob.getSolcConfig();

  const result = {
    language: "Solidity",
    sources,
    settings: settings ?? {},
  };

  // This code is pulled in from `resolveCompiler` in
  // `packages/hardhat-core/src/internal/core/config/config-resolution.ts`
  //
  // In v2 the config loading sets the default values that will be passed
  // to the compiler. I am pulling it to here for the moment to keep
  // the build system encapsulated.
  result.settings.optimizer = {
    enabled: false,
    runs: 200,
    ...result.settings.optimizer,
  };

  if (result.settings.outputSelection === undefined) {
    result.settings.outputSelection = {};
  }

  for (const [file, contractSelection] of Object.entries(
    defaultSolcOutputSelection,
  )) {
    if (result.settings.outputSelection[file] === undefined) {
      result.settings.outputSelection[file] = {};
    }

    for (const [contract, outputs] of Object.entries(contractSelection)) {
      if (result.settings.outputSelection[file][contract] === undefined) {
        result.settings.outputSelection[file][contract] = [];
      }

      for (const output of outputs) {
        const includesOutput: boolean =
          result.settings.outputSelection[file][contract].includes(output);

        if (!includesOutput) {
          result.settings.outputSelection[file][contract].push(output);
        }
      }
    }
  }

  return result;
}
