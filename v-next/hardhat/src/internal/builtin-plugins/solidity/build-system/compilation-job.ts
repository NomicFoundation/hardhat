import type { DependencyGraphImplementation } from "./dependency-graph.js";
import type { Remapping } from "./resolver/types.js";
import type { BuildInfo } from "../../../../types/artifacts.js";
import type { SolcConfig } from "../../../../types/config.js";
import type { CompilationJob } from "../../../../types/solidity/compilation-job.js";
import type { CompilerInput } from "../../../../types/solidity/compiler-io.js";
import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";

import crypto from "node:crypto";

import { formatRemapping } from "./resolver/remappings.js";

export class CompilationJobImplementation implements CompilationJob {
  public readonly dependencyGraph: DependencyGraph;
  public readonly solcConfig: SolcConfig;
  public readonly solcLongVersion: string;

  readonly #remappings: Remapping[];

  #buildId: string | undefined;

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

    // TODO: Set the default EVM target to the one of the compiler version
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
        outputSelection,
        remappings: this.#remappings.map(formatRemapping),
      },
    };
  }

  public getBuildId(): string {
    if (this.#buildId === undefined) {
      this.#buildId = this.#computeBuildId();
    }

    return this.#buildId;
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

    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(preimage, "utf-8"));

    return hash.digest("hex");
  }
}
