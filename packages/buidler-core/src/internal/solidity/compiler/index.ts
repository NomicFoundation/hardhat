import * as fs from "fs";

import { CompilerDownloader } from "./downloader";

export class Compiler {
  private static _getLocalSolcVersion(): string {
    return require("solc/package.json").version;
  }

  private readonly _version: string;
  private readonly _compilersDir: string;
  private readonly _downloader: CompilerDownloader;
  private readonly _localSolcVersion: string;
  private _loadedSolc?: any;

  constructor(
    version: string,
    compilersDir: string,
    compilerDownloader?: CompilerDownloader
  ) {
    this._version = version;
    this._compilersDir = compilersDir;
    this._localSolcVersion = Compiler._getLocalSolcVersion();

    if (compilerDownloader !== undefined) {
      this._downloader = compilerDownloader;
    } else {
      this._downloader = new CompilerDownloader(
        this._compilersDir,
        this._localSolcVersion
      );
    }
  }

  public async compile(input: any) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  public async getSolc() {
    if (this._loadedSolc !== undefined) {
      return this._loadedSolc;
    }

    if (this._isUsingLocalSolcVersion()) {
      this._loadedSolc = require("solc");
      return this._loadedSolc;
    }

    const compilerPath = await this._downloader.getDownloadedCompilerPath(
      this._version
    );

    const { default: solcWrapper } = await import("solc/wrapper");
    this._loadedSolc = solcWrapper(this._loadCompilerSources(compilerPath));

    return this._loadedSolc;
  }

  private _isUsingLocalSolcVersion() {
    return this._version === this._localSolcVersion;
  }

  /**
   * This function loads the compiler sources bypassing any require hook.
   *
   * The compiler is a huge asm.js file, and using a simple require may trigger
   * babel/register and hang the process.
   */
  private _loadCompilerSources(compilerPath: string) {
    const Module = module.constructor as any;
    const previousHook = Module._extensions[".js"];

    Module._extensions[".js"] = function (
      module: NodeJS.Module,
      filename: string
    ) {
      const content = fs.readFileSync(filename, "utf8");
      Object.getPrototypeOf(module)._compile.call(module, content, filename);
    };

    const loadedSolc = require(compilerPath);

    Module._extensions[".js"] = previousHook;

    return loadedSolc;
  }
}
