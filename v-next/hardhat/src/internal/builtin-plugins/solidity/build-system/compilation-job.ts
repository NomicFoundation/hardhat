import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";

import { createNonCryptographicHashId } from "@ignored/hardhat-vnext-utils/crypto";

import { formatRemapping } from "./resolver/remappings.js";
import { getEvmVersionFromSolcVersion } from "./solc-info.js";

export class CompilationJobImplementation implements CompilationJob {
  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];

  #buildId: string | undefined;
  #solcInput: CompilerInput | undefined;

  constructor(
    dependencyGraph: DependencyGraphImplementation,
    solcConfig: SolcConfig,
    solcLongVersion: string,
    remappings: Remapping[],
  ) {
    this.dependencyGraph = dependencyGraph;
    this.solcConfig = solcConfig;
    this.solcLongVersion = solcLongVersion;
    this.#remappings = remappings;
  }

  public getSolcInput(): CompilerInput {
    if (this.#solcInput === undefined) {
      this.#solcInput = this.#buildSolcInput();
    }

    return this.#solcInput;
  }

  public getBuildId(): string {
    if (this.#buildId === undefined) {
      this.#buildId = this.#computeBuildId();
    }

    return this.#buildId;
  }

  #buildSolcInput(): CompilerInput {
    const sources: { [sourceName: string]: { content: string } } = {};

    // we sort the files so that we always get the same compilation input
    const resolvedFiles = [...this.dependencyGraph.getAllFiles()].sort((a, b) =>
      a.sourceName.localeCompare(b.sourceName),
    );

    for (const file of resolvedFiles) {
      sources[file.sourceName] = {
        content: file.content.text,
      };
    }

    const settings = this.solcConfig.settings;

    // Ideally we would be more selective with the output selection, so that
    // we only ask solc to compile the root files.
    // Unfortunately, solc may need to generate bytecode of contracts/libraries
    // from other files (e.g. new Foo()), and it won't output its bytecode if
    // it's not asked for. This would prevent EDR from doing any runtime
    // analysis.
    const defaultOutputSelection: CompilerInput["settings"]["outputSelection"] =
      {
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
      };

    // TODO: Deep merge the user output selection with the default one
    const outputSelection = defaultOutputSelection;

    return {
      language: "Solidity",
      sources,
      settings: {
        ...settings,
        evmVersion:
          settings.evmVersion ??
          getEvmVersionFromSolcVersion(this.solcConfig.version),
        outputSelection,
        remappings: this.#remappings.map(formatRemapping),
      },
    };
  }

  #computeBuildId(): string {
    // NOTE: We type it this way so that this stop compiling if we ever change
    // the format of the BuildInfo type.
    const format: BuildInfo["_format"] = "hh3-sol-build-info-1";

    // The preimage should include all the information that makes this
    // compilation job unique, and as this is used to identify the build info
    // file, it also includes its format string.
    const preimage =
      format +
      this.solcLongVersion +
      JSON.stringify(this.getSolcInput()) +
      JSON.stringify(this.solcConfig);

    return createNonCryptographicHashId(preimage);
  }
}
