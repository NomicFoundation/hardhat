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
  chmod,
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

/**
 * Spawns a compilation process and returns its output.
 *
 * It pipes the stdout of the compilation process to a temporary file to avoid exceeding
 * the maximum buffer size. It later reads the file as stream to parse it into a CompilerOutput.
 *
 * It also pipes the stderr of the compilation process to the stderr of the main process.
 *
 * @param command The compilation command to run
 * @param args The arguments to pass to the compilation command
 * @param input The solc input to pass to the compilation command on stdin
 * @returns The compilation output
 * @throws Error if the compilation process exits with a non-zero exit code.
 * @throws HardhatInvariantError if the any of the io streams are null.
 */
async function spawnCompile(
  command: string,
  args: string[],
  input: CompilerInput,
): Promise<CompilerOutput> {
  // We create a temporary folder to store the output of the compiler in
  // We use a random UUID to avoid collisions with other compilations
  const tmpHardhatSolc = path.join(os.tmpdir(), "hardhat-solc");
  const tmpFolder = path.join(tmpHardhatSolc, crypto.randomUUID());
  await mkdir(tmpFolder);

  // Make hardhat-solc dir globally writable to prevent permission issues on unix
  // mkdir() defaults to 777 but can result it lesser permissions due to umask
  // (see: https://github.com/nodejs/node/issues/15092)
  // issue: https://github.com/NomicFoundation/hardhat/issues/7161
  await chmod(tmpHardhatSolc, 0o777).catch(() => {
    // ignore errors if we can't change the permissions
  });

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
      // NOTE: Compiler warnings are NOT written to stder, they are returned via
      // the `errors` field of the CompilerOutput instead
      const stderrPipeline = subprocess.stderr.pipe(
        createNonClosingWriter(process.stderr),
      );

      subprocess.on("close", async (code) => {
        // We wait for the io pipelines to finish before resolving the compilation promise
        await finished(stdoutPipeline);
        await finished(stderrPipeline);

        // Explicitly closing the file handle to fully release the underlying resources
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
      ? ["--import", import.meta.resolve("tsx/esm")]
      : [];

    const args = [...nodeOptions];

    // NOTE(https://github.com/nodejs/node/issues/31710): We're using file URLs
    // on Windows instead of path because only URLs with a scheme are supported
    // by the default ESM loader there.
    if (os.platform() === "win32") {
      const compilerFileUrl = pathToFileURL(this.compilerPath);
      // NOTE: The script path passed to a tsx/esm loader is an exception to the
      // above rule since the tsx/esm loader doesn't support URLs with a scheme.
      args.push(scriptPath);
      args.push(compilerFileUrl.href);
    } else {
      args.push(scriptPath, this.compilerPath);
    }

    try {
      return await spawnCompile(process.execPath, args, input);
    } catch (e) {
      ensureError(e);

      // We pack any error encountered during the compilation process into a HardhatError
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.CANT_RUN_SOLCJS_COMPILER,
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

      // We pack any error encountered during the compilation process into a HardhatError
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.CANT_RUN_NATIVE_COMPILER,
        e,
      );
    }
  }
}
