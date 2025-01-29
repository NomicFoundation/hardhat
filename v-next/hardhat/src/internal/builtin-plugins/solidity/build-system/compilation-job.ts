import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity.js";

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
  #solcInputWithoutSources: Omit<CompilerInput, "sources"> | undefined;
  #resolvedFiles: ResolvedFile[] | undefined;

  static readonly #sourceContentHashCache = new Map<string, string>();

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

  async #getSourceContentHash(file: ResolvedFile): Promise<string> {
    const cachedSourceContentHash =
      CompilationJobImplementation.#sourceContentHashCache.get(file.sourceName);
    if (cachedSourceContentHash !== undefined) {
      return cachedSourceContentHash;
    }

    const sourceContentHash = await createNonCryptographicHashId(
      file.content.text,
    );
    CompilationJobImplementation.#sourceContentHashCache.set(
      file.sourceName,
      sourceContentHash,
    );
    return sourceContentHash;
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
          hash: await this.#getSourceContentHash(file),
        };
      }),
    );

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
      JSON.stringify(sortedSources);
    JSON.stringify(this.solcConfig);

    return createNonCryptographicHashId(preimage);
  }
}
