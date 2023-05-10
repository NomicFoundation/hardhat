import { execFile } from "child_process";
import * as fs from "fs";
import { CompilerInput, CompilerOutput } from "../../../types";
import { HardhatError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";

export interface ICompiler {
  compile(input: CompilerInput): Promise<CompilerOutput>;
}

export class Compiler implements ICompiler {
  private _loadedSolc?: any;

  constructor(private _pathToSolcJs: string) {}

  public async compile(input: CompilerInput) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  public async getSolc() {
    if (this._loadedSolc !== undefined) {
      return this._loadedSolc;
    }

    const solcWrapper = require("solc/wrapper");
    this._loadedSolc = solcWrapper(
      this._loadCompilerSources(this._pathToSolcJs)
    );

    return this._loadedSolc;
  }

  /**
   * This function loads the compiler sources bypassing any require hook.
   *
   * The compiler is a huge asm.js file, and using a simple require may trigger
   * babel/register and hang the process.
   */
  private _loadCompilerSources(compilerPath: string) {
    const Module = module.constructor as any;

    // if Hardhat is bundled (for example, in the vscode extension), then
    // Module._extenions might be undefined. In that case, we just use a plain
    // require.
    if (Module._extensions === undefined) {
      return require(compilerPath);
    }

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

export class NativeCompiler implements ICompiler {
  constructor(private _pathToSolc: string) {}

  public async compile(input: CompilerInput) {
    const output: string = await new Promise((resolve, reject) => {
      try {
        const process = execFile(
          this._pathToSolc,
          [`--standard-json`],
          {
            maxBuffer: 1024 * 1024 * 500,
          },
          (err, stdout) => {
            if (err !== null) {
              return reject(err);
            }
            resolve(stdout);
          }
        );

        process.stdin!.write(JSON.stringify(input));
        process.stdin!.end();
      } catch (e: any) {
        throw new HardhatError(ERRORS.SOLC.CANT_RUN_NATIVE_COMPILER, {}, e);
      }
    });

    return JSON.parse(output);
  }
}
