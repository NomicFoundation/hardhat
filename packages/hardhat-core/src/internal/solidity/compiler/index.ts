import * as fs from "fs";

export class Compiler {
  private _loadedSolc?: any;

  constructor(private _pathToSolcJs: string) {}

  public async compile(input: any) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  public async getSolc() {
    if (this._loadedSolc !== undefined) {
      return this._loadedSolc;
    }

    const { default: solcWrapper } = await import("solc/wrapper");
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
