import { DependencyGraph } from "../dependencyGraph";
import { CompilerDownloader } from "./downloader";

export interface SolcOptimizerConfig {
  enabled: boolean;
  runs: number;
}

export class Compiler {
  private loadedSolc?: any;
  private readonly downloader: CompilerDownloader;
  private readonly localSolcVersion: string;

  constructor(
    private readonly version: string,
    private readonly compilersDir: string,
    private readonly optimizerConfig: SolcOptimizerConfig,
    compilerDownloader?: CompilerDownloader
  ) {
    this.localSolcVersion = Compiler.getLocalSolcVersion();

    if (compilerDownloader !== undefined) {
      this.downloader = compilerDownloader;
    } else {
      this.downloader = new CompilerDownloader(
        this.compilersDir,
        this.localSolcVersion
      );
    }
  }

  getInputFromDependencyGraph(graph: DependencyGraph) {
    const sources: { [globalName: string]: { content: string } } = {};
    for (const file of graph.getResolvedFiles()) {
      sources[file.globalName] = {
        content: file.content
      };
    }

    return {
      language: "Solidity",
      sources,
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true
        },
        optimizer: this.optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"]
          }
        }
      }
    };
  }

  async compile(input: any) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  async getSolc() {
    if (this.loadedSolc !== undefined) {
      return this.loadedSolc;
    }

    if (this.isUsingLocalSolcVersion()) {
      this.loadedSolc = require("solc");
      return this.loadedSolc;
    }

    const compilerPath = await this.downloader.getDownloadedCompilerPath(
      this.version
    );

    const { default: solcWrapper } = await import("solc/wrapper");
    this.loadedSolc = solcWrapper(await import(compilerPath));

    return this.loadedSolc;
  }

  private isUsingLocalSolcVersion() {
    return this.version === this.localSolcVersion;
  }

  private static getLocalSolcVersion(): string {
    return require("solc/package.json").version;
  }
}
