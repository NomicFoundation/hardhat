import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity.js";

import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";

import { formatRemapping } from "./resolver/remappings.js";
import { getEvmVersionFromSolcVersion } from "./solc-info.js";

export class CompilationJobImplementation implements CompilationJob {
  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];

  #buildId: string | undefined;
  #solcInput: CompilerInput | undefined;
  #solcInputWithoutSources: Omit<CompilerInput, "sources"> | undefined;
  #resolvedFiles: ResolvedFile[] | undefined;

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

  public async getBuildId(): Promise<string> {
    if (this.#buildId === undefined) {
      this.#buildId = await this.#computeBuildId();
    }

    return this.#buildId;
  }

  #getSolcInputWithoutSources(): Omit<CompilerInput, "sources"> {
    if (this.#solcInputWithoutSources === undefined) {
      this.#solcInputWithoutSources = this.#buildSolcInputWithoutSources();
    }

    return this.#solcInputWithoutSources;
  }

  #getResolvedFiles(): ResolvedFile[] {
    if (this.#resolvedFiles === undefined) {
      // we sort the files so that we always get the same compilation input
      this.#resolvedFiles = [...this.dependencyGraph.getAllFiles()].sort(
        (a, b) => a.sourceName.localeCompare(b.sourceName),
      );
    }

    return this.#resolvedFiles;
  }

  #buildSolcInput(): CompilerInput {
    const solcInputWithoutSources = this.#getSolcInputWithoutSources();

    const sources: { [sourceName: string]: { content: string } } = {};

    const resolvedFiles = this.#getResolvedFiles();

    for (const file of resolvedFiles) {
      sources[file.sourceName] = {
        content: file.content.text,
      };
    }

    return {
      ...solcInputWithoutSources,
      sources,
    };
  }

  #buildSolcInputWithoutSources(): Omit<CompilerInput, "sources"> {
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
          "": ["ast"],
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
            "metadata",
          ],
        },
      };

    const outputSelection = defaultOutputSelection;

    const configOutputSelection = settings.outputSelection ?? {};

    for (const fileKey of Object.keys(configOutputSelection).sort()) {
      const configFileOutputSelection = configOutputSelection[fileKey] ?? {};
      outputSelection[fileKey] ??= {};

      for (const contractKey of Object.keys(configFileOutputSelection).sort()) {
        const configContractOutputSelection =
          configFileOutputSelection[contractKey] ?? [];
        outputSelection[fileKey][contractKey] ??= [];

        const values = Array.from(
          new Set([
            ...outputSelection[fileKey][contractKey],
            ...configContractOutputSelection,
          ]),
        ).sort();

        outputSelection[fileKey][contractKey] = values;
      }
    }

    return {
      language: "Solidity",
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

    const sources: { [sourceName: string]: { hash: string } } = {};
    const resolvedFiles = this.#getResolvedFiles();

    await Promise.all(
      resolvedFiles.map(async (file) => {
        sources[file.sourceName] = {
          hash: await file.getContentHash(),
        };
      }),
    );

    // NOTE: We need to sort the sources because the sources map might be
    // populated out of order which does affect serialisation.
    const sortedSources = Object.fromEntries(
      Object.entries(sources).sort((a, b) => a[0].localeCompare(b[0])),
    );

    // The preimage should include all the information that makes this
    // compilation job unique, and as this is used to identify the build info
    // file, it also includes its format string.
    const preimage =
      format +
      this.solcLongVersion +
      JSON.stringify(this.#getSolcInputWithoutSources()) +
      JSON.stringify(sortedSources) +
      JSON.stringify(this.solcConfig);

    return createNonCryptographicHashId(preimage);
  }
}
