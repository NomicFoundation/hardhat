import type {
  CompilerInput,
  CompilerOutput,
} from "../../../../../types/solidity/compiler-io.js";

import { spawn } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  mkdir,
  readJsonFileAsStream,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { createNonClosingWriter } from "@nomicfoundation/hardhat-utils/stream";
import * as semver from "semver";

export interface Compiler {
  readonly version: string;
  readonly longVersion: string;
  readonly compilerPath: string;
  readonly isSolcJs: boolean;

  compile(input: CompilerInput): Promise<CompilerOutput>;
}

async function spawnCompile(
  command: string,
  args: string[],
  input: CompilerInput,
): Promise<CompilerOutput> {
  const tmpFolder = path.join(os.tmpdir(), "hardhat-solc", crypto.randomUUID());
  await mkdir(tmpFolder);

  try {
    return await new Promise(async (resolve, reject) => {
      const stdoutPath = path.join(tmpFolder, "stdout.txt");
      const stdoutFileHandle = await fsPromises.open(stdoutPath, "w");
      const stdoutWriteStream = stdoutFileHandle.createWriteStream();

      const subprocess = spawn(command, args);

      assertHardhatInvariant(
        subprocess.stdout !== null,
        "process.stdout is null",
      );
      assertHardhatInvariant(
        subprocess.stderr !== null,
        "process.stderr is null",
      );

      const stdoutPipeline = subprocess.stdout.pipe(stdoutWriteStream);
      const stderrPipeline = subprocess.stderr.pipe(
        createNonClosingWriter(process.stderr),
      );

      subprocess.on("close", async (code) => {
        await finished(stdoutPipeline);
        await finished(stderrPipeline);

        await stdoutFileHandle.close();

        if (code !== 0) {
          return reject(new Error(`Subprocess exited with code ${code}`));
        }

        resolve(await readJsonFileAsStream(stdoutPath));
      });

      assertHardhatInvariant(
        subprocess.stdin !== null,
        "process.stdin is null",
      );

      subprocess.stdin.write(JSON.stringify(input));
      subprocess.stdin.end();
    });
  } finally {
    await remove(tmpFolder);
  }
}

export class SolcJsCompiler implements Compiler {
  public readonly isSolcJs = true;

  constructor(
    public readonly version: string,
    public readonly longVersion: string,
    public readonly compilerPath: string,
  ) {}

  public async compile(input: CompilerInput): Promise<CompilerOutput> {
    const scriptFileUrl = import.meta.resolve("./solcjs-runner.js");
    const scriptPath = fileURLToPath(scriptFileUrl);

    // If the script is a TypeScript file, we need to pass the --import tsx/esm
    // which is available, as we are running the tests
    const nodeOptions = scriptPath.endsWith(".ts")
      ? ["--import", "tsx/esm"]
      : [];

    const args = [...nodeOptions];

    // NOTE(https://github.com/nodejs/node/issues/31710): We're using file URLs
    // on Windows instead of path because only URLs with a scheme are supported
    // by the default ESM loader there.
    if (os.platform() === "win32") {
      const compilerFileUrl = pathToFileURL(this.compilerPath);
      // NOTE: The script path passed to a tsx/esm loader is an exception to the
      // above rule since the tsx/esm loader doesn't support URLs with a scheme.
      if (scriptPath.endsWith(".ts")) {
        args.push(scriptPath);
      } else {
        args.push(scriptFileUrl);
      }
      args.push(compilerFileUrl.href);
    } else {
      args.push(scriptPath, this.compilerPath);
    }

    try {
      return await spawnCompile(process.execPath, args, input);
    } catch (e) {
      ensureError(e);

      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY.CANT_RUN_SOLCJS_COMPILER,
        e,
      );
    }
  }
}

export class NativeCompiler implements Compiler {
  public readonly isSolcJs = false;

  constructor(
    public readonly version: string,
    public readonly longVersion: string,
    public readonly compilerPath: string,
  ) {}

  public async compile(input: CompilerInput): Promise<CompilerOutput> {
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

    try {
      return await spawnCompile(this.compilerPath, args, input);
    } catch (e) {
      ensureError(e);

      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY.CANT_RUN_NATIVE_COMPILER,
        e,
      );
    }
  }
}
