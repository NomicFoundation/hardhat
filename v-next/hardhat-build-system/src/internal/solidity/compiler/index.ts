import type { CompilerInput, CompilerOutput } from "../../types/index.js";

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import * as semver from "semver";

import { ERRORS } from "../../error-descriptors.js";

export interface ICompiler {
  compile(input: CompilerInput): Promise<CompilerOutput>;
}

export class Compiler implements ICompiler {
  readonly #pathToSolcJs: string;

  constructor(pathToSolcJs: string) {
    this.#pathToSolcJs = pathToSolcJs;
  }

  public async compile(input: CompilerInput): Promise<any> {
    const scriptPath = fileURLToPath(import.meta.resolve("./solcjs-runner.js"));

    // If the script is a TypeScript file, we need to pass the --import tsx/esm
    // which is available, as we are running the tests
    const nodeOptions = scriptPath.endsWith(".ts")
      ? ["--import", "tsx/esm"]
      : [];

    const output: string = await new Promise((resolve, reject) => {
      try {
        const subprocess = execFile(
          process.execPath,
          [...nodeOptions, scriptPath, this.#pathToSolcJs],
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

        assertHardhatInvariant(
          subprocess.stdin !== null,
          "process.stdin should be defined",
        );

        subprocess.stdin.write(JSON.stringify(input));
        subprocess.stdin.end();
      } catch (e) {
        ensureError(e);

        throw new HardhatError(ERRORS.SOLC.CANT_RUN_SOLCJS_COMPILER, e);
      }
    });

    return JSON.parse(output);
  }
}

export class NativeCompiler implements ICompiler {
  readonly #pathToSolc: string;
  readonly #solcVersion?: string;

  constructor(_pathToSolc: string, _solcVersion?: string) {
    this.#pathToSolc = _pathToSolc;
    this.#solcVersion = _solcVersion;
  }

  public async compile(input: CompilerInput): Promise<any> {
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
      } catch (e) {
        ensureError(e);

        throw new HardhatError(ERRORS.SOLC.CANT_RUN_NATIVE_COMPILER, e);
      }
    });

    return JSON.parse(output);
  }
}
