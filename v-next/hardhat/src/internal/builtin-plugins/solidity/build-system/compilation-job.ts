import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { HookManager } from "../../../../types/hooks.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";

import {
  ResolvedFileType,
  type ResolvedFile,
} from "../../../../types/solidity.js";

import { formatRemapping } from "./resolver/remappings.js";
import { getEvmVersionFromSolcVersion } from "./solc-info.js";

export class CompilationJobImplementation implements CompilationJob {
  static #fileContents: Record<string, string> = {};
  static #fileContentHashes: Record<string, string> = {};

  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];
  readonly #hooks: HookManager;

  #buildId: string | undefined;
  #solcInput: CompilerInput | undefined;
  #solcInputWithoutSources: Omit<CompilerInput, "sources"> | undefined;
  #resolvedFiles: ResolvedFile[] | undefined;

  constructor(
    dependencyGraph: DependencyGraphImplementation,
    solcConfig: SolcConfig,
    solcLongVersion: string,
    remappings: Remapping[],
    hooks: HookManager,
  ) {
    this.dependencyGraph = dependencyGraph;
    this.solcConfig = solcConfig;
    this.solcLongVersion = solcLongVersion;
    this.#remappings = remappings;
    this.#hooks = hooks;
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

  async #getFileContent(file: ResolvedFile): Promise<string> {
    if (file.type === ResolvedFileType.NPM_PACKAGE_FILE) {
      return file.content.text;
    }

    let fileContent: string | undefined;

    if (
      process.env.HARDHAT_TEST_COMPILATION_JOB_IMPLEMENTATION_CACHE ===
        "false" ||
      CompilationJobImplementation.#fileContents[file.sourceName] === undefined
    ) {
      const solcVersion = this.solcConfig.version;
      fileContent = await this.#hooks.runHandlerChain(
        "solidity",
        "preprocessProjectFileBeforeBuilding",
        [file.sourceName, file.content.text, solcVersion],
        async (_context, nextSourceName, nextFileContent, nextSolcVersion) => {
          assertHardhatInvariant(
            file.sourceName === nextSourceName,
            "Cannot modify source name in preprocessProjectFileBeforeBuilding",
          );
          assertHardhatInvariant(
            solcVersion === nextSolcVersion,
            "Cannot modify solc version in preprocessProjectFileBeforeBuilding",
          );
          return nextFileContent;
        },
      );
      CompilationJobImplementation.#fileContents[file.sourceName] = fileContent;
    } else {
      fileContent = CompilationJobImplementation.#fileContents[file.sourceName];
    }

    return fileContent;
  }

  async #getFileContentHash(file: ResolvedFile): Promise<string> {
    let fileContentHash: string | undefined;

    if (
      process.env.HARDHAT_TEST_COMPILATION_JOB_IMPLEMENTATION_CACHE ===
        "false" ||
      CompilationJobImplementation.#fileContentHashes[file.sourceName] ===
        undefined
    ) {
      const fileContent = await this.#getFileContent(file);
      fileContentHash = await createNonCryptographicHashId(fileContent);
      CompilationJobImplementation.#fileContentHashes[file.sourceName] =
        fileContentHash;
    } else {
      fileContentHash =
        CompilationJobImplementation.#fileContentHashes[file.sourceName];
    }

    return fileContentHash;
  }

  async #buildSolcInput(): Promise<CompilerInput> {
    const solcInputWithoutSources = this.#getSolcInputWithoutSources();

    const sources: { [sourceName: string]: { content: string } } = {};

    const resolvedFiles = this.#getResolvedFiles();

    for (const file of resolvedFiles) {
      const content = await this.#getFileContent(file);
      sources[file.sourceName] = {
        content,
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
        const hash = await this.#getFileContentHash(file);
        sources[file.sourceName] = {
          hash,
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
