import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { CoverageMetadata } from "../../../../types/coverage/types.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity.js";

import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";

import { ResolvedFileType } from "../../../../types/solidity.js";

import { formatRemapping } from "./resolver/remappings.js";
import { getEvmVersionFromSolcVersion } from "./solc-info.js";

export class CompilationJobImplementation implements CompilationJob {
  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];
  readonly #coverage: boolean;

  #buildId: string | undefined;
  #solcInput: CompilerInput | undefined;
  #solcInputWithoutSources: Omit<CompilerInput, "sources"> | undefined;
  #resolvedFiles: ResolvedFile[] | undefined;
  #coverageMetadata: CoverageMetadata | undefined;

  constructor(
    dependencyGraph: DependencyGraphImplementation,
    solcConfig: SolcConfig,
    solcLongVersion: string,
    remappings: Remapping[],
    coverage: boolean,
  ) {
    this.dependencyGraph = dependencyGraph;
    this.solcConfig = solcConfig;
    this.solcLongVersion = solcLongVersion;
    this.#remappings = remappings;
    this.#coverage = coverage;
  }

  public getCoverageMetadata(): CoverageMetadata {
    if (this.#coverageMetadata === undefined) {
      [this.#solcInput, this.#coverageMetadata] =
        this.#buildSolcInputAndCoverageMetadata();
    }

    return this.#coverageMetadata;
  }

  public getSolcInput(): CompilerInput {
    if (this.#solcInput === undefined) {
      [this.#solcInput, this.#coverageMetadata] =
        this.#buildSolcInputAndCoverageMetadata();
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

  #buildSolcInputAndCoverageMetadata(): [CompilerInput, CoverageMetadata] {
    const solcInputWithoutSources = this.#getSolcInputWithoutSources();

    const sources: { [sourceName: string]: { content: string } } = {};
    let coverageMetadata: CoverageMetadata = {};

    const resolvedFiles = this.#getResolvedFiles();

    for (const file of resolvedFiles) {
      if (this.#coverage && file.type === ResolvedFileType.PROJECT_FILE) {
        // TODO: Call EDR to instrument the content of the file and obtain the metadata
        const { content, metadata } = {
          content: file.content.text,
          metadata: {},
        };
        sources[file.sourceName] = {
          content,
        };
        coverageMetadata = {
          ...coverageMetadata,
          ...metadata,
        };
      } else {
        sources[file.sourceName] = {
          content: file.content.text,
        };
      }
    }

    const solcInput = {
      ...solcInputWithoutSources,
      sources,
    };

    return [solcInput, coverageMetadata];
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
        sources[file.sourceName] = {
          // NOTE: We use the hash of the original content regardless whether
          // the file is instrumented for coverage or not. This is OK because
          // we use the coverage flag itself as part of the build ID and the
          // instrumentation process is deterministic.
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
    const preimage = JSON.stringify({
      format,
      solcLongVersion: this.solcLongVersion,
      solcInput: this.#getSolcInputWithoutSources(),
      sources: sortedSources,
      solcConfig: this.solcConfig,
      coverage: this.#coverage,
    });

    return createNonCryptographicHashId(preimage);
  }
}
