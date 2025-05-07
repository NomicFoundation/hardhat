import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { HookManager } from "../../../../types/hooks.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";
import { deepClone } from "@nomicfoundation/hardhat-utils/lang";

import {
  ResolvedFileType,
  type ResolvedFile,
} from "../../../../types/solidity.js";

import { formatRemapping } from "./resolver/remappings.js";
import { getEvmVersionFromSolcVersion } from "./solc-info.js";

export class CompilationJobImplementation implements CompilationJob {
  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];
  readonly #hooks: HookManager;

  #buildId: string | undefined;
  #solcInput: CompilerInput | undefined;

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
      const solcInput = await this.#buildSolcInput();
      this.#solcInput = await this.#hooks.runHandlerChain(
        "solidity",
        "preprocessSolcInputBeforeBuilding",
        [solcInput],
        async (_context, nextSolcInput) => {
          return nextSolcInput;
        },
      );
    }

    return this.#solcInput;
  }

  public async getBuildId(): Promise<string> {
    if (this.#buildId === undefined) {
      this.#buildId = await this.#computeBuildId();
    }

    return this.#buildId;
  }

  async #getFileContent(file: ResolvedFile): Promise<string> {
    if (file.type === ResolvedFileType.NPM_PACKAGE_FILE) {
      return file.content.text;
    }

    const solcVersion = this.solcConfig.version;
    return this.#hooks.runHandlerChain(
      "solidity",
      "preprocessProjectFileBeforeBuilding",
      [file.sourceName, file.content.text, solcVersion],
      async (_context, nextSourceName, nextFileContent, nextSolcVersion) => {
        if (file.sourceName !== nextSourceName) {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.HOOKS.UNEXPECTED_HOOK_PARAM_MODIFICATION,
            {
              hookCategoryName: "solidity",
              hookName: "preprocessProjectFileBeforeBuilding",
              paramName: "sourceName",
            },
          );
        }

        if (solcVersion !== nextSolcVersion) {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.HOOKS.UNEXPECTED_HOOK_PARAM_MODIFICATION,
            {
              hookCategoryName: "solidity",
              hookName: "preprocessProjectFileBeforeBuilding",
              paramName: "solcVersion",
            },
          );
        }

        return nextFileContent;
      },
    );
  }

  async #buildSolcInput(): Promise<CompilerInput> {
    const settings = this.solcConfig.settings;

    // Ideally we would be more selective with the output selection, so that
    // we only ask solc to compile the root files.
    // Unfortunately, solc may need to generate bytecode of contracts/libraries
    // from other files (e.g. new Foo()), and it won't output its bytecode if
    // it's not asked for. This would prevent EDR from doing any runtime
    // analysis.
    const outputSelection = await deepClone(settings.outputSelection ?? {});
    outputSelection["*"] ??= {};
    outputSelection["*"][""] ??= [];
    outputSelection["*"]["*"] ??= [];

    outputSelection["*"][""].push("ast");
    outputSelection["*"]["*"].push(
      "abi",
      "evm.bytecode",
      "evm.deployedBytecode",
      "evm.methodIdentifiers",
      "metadata",
    );

    const sources: { [sourceName: string]: { content: string } } = {};

    // we sort the files so that we always get the same compilation input
    const resolvedFiles = [...this.dependencyGraph.getAllFiles()].sort((a, b) =>
      a.sourceName.localeCompare(b.sourceName),
    );

    for (const file of resolvedFiles) {
      const content = await this.#getFileContent(file);
      sources[file.sourceName] = {
        content,
      };
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
      sources,
    };
  }

  async #computeBuildId(): Promise<string> {
    // NOTE: We type it this way so that this stop compiling if we ever change
    // the format of the BuildInfo type.
    const format: BuildInfo["_format"] = "hh3-sol-build-info-1";

    const solcInput = await this.getSolcInput();

    // The preimage should include all the information that makes this
    // compilation job unique, and as this is used to identify the build info
    // file, it also includes its format string.
    const preimage = JSON.stringify({
      format,
      solcLongVersion: this.solcLongVersion,
      solcInput,
      solcConfig: this.solcConfig,
    });

    return createNonCryptographicHashId(preimage);
  }
}
