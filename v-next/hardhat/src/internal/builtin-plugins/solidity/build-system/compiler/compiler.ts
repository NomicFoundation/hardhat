import type {
  CompilerInput,
  CompilerOutput,
} from "../../../../../types/solidity/compiler-io.js";

import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { mkdir } from "@ignored/hardhat-vnext-utils/fs";
import * as semver from "semver";

export interface Compiler {
  readonly version: string;
  readonly longVersion: string;
  readonly compilerPath: string;
  readonly isSolcJs: boolean;

  compile(input: CompilerInput): Promise<CompilerOutput>;
}

const COMPILATION_SUBPROCESS_IO_BUFFER_SIZE = 1024 * 1024 * 500;

export class SolcJsCompiler implements Compiler {
  public readonly isSolcJs = true;

  constructor(
    public readonly version: string,
    public readonly longVersion: string,
    public readonly compilerPath: string,
  ) {}

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
          [...nodeOptions, scriptPath, this.compilerPath],
          {
            maxBuffer: COMPILATION_SUBPROCESS_IO_BUFFER_SIZE,
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

        throw new HardhatError(
          HardhatError.ERRORS.SOLIDITY.CANT_RUN_SOLCJS_COMPILER,
          e,
        );
      }
    });

    return JSON.parse(output);
  }
}

export class NativeCompiler implements Compiler {
  public readonly isSolcJs = false;

  constructor(
    public readonly version: string,
    public readonly longVersion: string,
    public readonly compilerPath: string,
  ) {}

  public async compile(input: CompilerInput): Promise<any> {
    const args = ["--standard-json"];

    // Logic to make sure that solc default import callback is not being used.
    // If solcVersion is not defined or <= 0.6.8, do not add extra args.
    if (this.version !== undefined) {
      if (semver.gte(this.version, "0.8.22")) {
        // version >= 0.8.22
        args.push("--no-import-callback");
      } else if (semver.gte(this.version, "0.6.9")) {
        // version >= 0.6.9
        const tmpFolder = path.join(os.tmpdir(), "hardhat-solc");
        await mkdir(tmpFolder);
        args.push(`--base-path`);
        args.push(tmpFolder);
      }
    }

    const output: string = await new Promise((resolve, reject) => {
      try {
        const process = execFile(
          this.compilerPath,
          args,
          {
            maxBuffer: COMPILATION_SUBPROCESS_IO_BUFFER_SIZE,
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

        throw new HardhatError(
          HardhatError.ERRORS.SOLIDITY.CANT_RUN_NATIVE_COMPILER,
          e,
        );
      }
    });

    return JSON.parse(output);
  }
}
