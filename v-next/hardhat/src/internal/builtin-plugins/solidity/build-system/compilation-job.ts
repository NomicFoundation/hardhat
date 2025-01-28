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

  public async getSolcInput(): Promise<CompilerInput> {
    if (this.#solcInput === undefined) {
      this.#solcInput = await this.#buildSolcInput();
    }

    return this.#solcInput;
  }

  public async getBuildId(): Promise<string> {
    if (this.#buildId === undefined) {
      this.#buildId = await this.#computeBuildId();
    }

    return this.#buildId;
  }

  async #buildSolcInput(): Promise<CompilerInput> {
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

    const rootsOutputSelection: CompilerInput["settings"]["outputSelection"] =
      Object.fromEntries(
        [...this.dependencyGraph.getRoots().values()]
          .sort((a, b) => a.sourceName.localeCompare(b.sourceName))
          .map((root) => [
            root.sourceName,
            {
              "*": [
                "abi",
                "evm.bytecode",
                "evm.deployedBytecode",
                "evm.methodIdentifiers",
                "metadata",
              ],
            },
          ]),
      );

    const defaultOutputSelection: CompilerInput["settings"]["outputSelection"] =
      {
        "*": {
          "": ["ast"],
        },
        ...rootsOutputSelection,
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

  async #computeBuildId(): Promise<string> {
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
