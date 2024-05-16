import { execFile } from "node:child_process";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import * as semver from "semver";

import { ERRORS } from "../../errors/errors-list.js";
import { HardhatError } from "../../errors/errors.js";
import { CompilerInput, CompilerOutput } from "../../types/index.js";

export interface ICompiler {
  compile(input: CompilerInput): Promise<CompilerOutput>;
}

export class Compiler implements ICompiler {
  readonly #pathToSolcJs;
  #loadedSolc?: any;

  constructor(_pathToSolcJs: string) {
    this.#pathToSolcJs = _pathToSolcJs;
  }

  public async compile(input: CompilerInput) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compile(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  public async getSolc() {
    if (this.#loadedSolc !== undefined) {
      return this.#loadedSolc;
    }

    const solcWrapper = require("solc/wrapper");
    this.#loadedSolc = solcWrapper(
      this.#loadCompilerSources(this.#pathToSolcJs),
    );

    return this.#loadedSolc;
  }

  /**
   * This function loads the compiler sources bypassing any require hook.
   *
   * The compiler is a huge asm.js file, and using a simple require may trigger
   * babel/register and hang the process.
   */
  #loadCompilerSources(compilerPath: string) {
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
      filename: string,
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
  readonly #pathToSolc: string;
  readonly #solcVersion?: string;

  constructor(_pathToSolc: string, _solcVersion?: string) {
    this.#pathToSolc = _pathToSolc;
    this.#solcVersion = _solcVersion;
  }

  public async compile(input: CompilerInput) {
    const args = ["--standard-json"];

    // Logic to make sure that solc default import callback is not being used.
    // If solcVersion is not defined or <= 0.6.8, do not add extra args.
    if (this.#solcVersion !== undefined) {
      if (semver.gte(this.#solcVersion, "0.8.22")) {
        // version >= 0.8.22
        args.push("--no-import-callback");
      } else if (semver.gte(this.#solcVersion, "0.6.9")) {
        // version >= 0.6.9
        const tmpFolder = path.join(os.tmpdir(), "hardhat-solc");
        fs.mkdirSync(tmpFolder, { recursive: true });
        args.push(`--base-path`);
        args.push(tmpFolder);
      }
    }

    const output: string = await new Promise((resolve, reject) => {
      try {
        const process = execFile(
          this.#pathToSolc,
          args,
          {
            maxBuffer: 1024 * 1024 * 500,
          },
          (err, stdout) => {
            if (err !== null) {
              return reject(err);
            }
            resolve(stdout);
          },
        );

        assertHardhatInvariant(process.stdin !== null, "process.stdin is null");

        process.stdin.write(JSON.stringify(input));
        process.stdin.end();
      } catch (e: any) {
        throw new HardhatError(ERRORS.SOLC.CANT_RUN_NATIVE_COMPILER, {}, e);
      }
    });

    return JSON.parse(output);
  }
}
