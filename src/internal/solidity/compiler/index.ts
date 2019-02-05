import { SolcOptimizerConfig } from "../../../types";
import { DependencyGraph } from "../dependencyGraph";

import { CompilerDownloader } from "./downloader";

export class Compiler {
  private static getLocalSolcVersion(): string {
    return require("solc/package.json").version;
  }
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

  public getInputFromDependencyGraph(graph: DependencyGraph) {
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

  public async compile(input: any) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  public async getSolc() {
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
    this.loadedSolc = solcWrapper(this.loadCompilerSources(compilerPath));

    return this.loadedSolc;
  }

  private isUsingLocalSolcVersion() {
    return this.version === this.localSolcVersion;
  }

  /**
   * This function loads the compiler sources bypassing any require hook.
   *
   * The compiler is a huge asm.js file, and using a simple require may trigger
   * babel/register and hang the process.
   */
  private loadCompilerSources(compilerPath: string) {
    const Module = module.constructor as any;
    const previousHook = Module._extensions[".js"];

    Module._extensions[".js"] = function(
      module: NodeJS.Module,
      filename: string
    ) {
      const fs = require("fs");
      const content = fs.readFileSync(filename, "utf8");
      Object.getPrototypeOf(module)._compile.call(module, content, filename);
    };

    const loadedSolc = require(compilerPath);

    Module._extensions[".js"] = previousHook;

    return loadedSolc;
  }
}
