import type { Compiler } from "./compiler.js";

import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";
import { sha256 } from "@nomicfoundation/hardhat-utils/crypto";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  chmod,
  createFile,
  ensureDir,
  exists,
  readBinaryFile,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { getPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { download } from "@nomicfoundation/hardhat-utils/request";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import debug from "debug";

import { NativeCompiler, SolcJsCompiler } from "./compiler.js";

const log = debug("hardhat:solidity:downloader");

const COMPILER_REPOSITORY_URL = "https://binaries.soliditylang.org";

// We use a mirror of nikitastupin/solc because downloading directly from
// github has rate limiting issues
const LINUX_ARM64_REPOSITORY_URL =
  "https://solc-linux-arm64-mirror.hardhat.org/linux/aarch64";

export enum CompilerPlatform {
  LINUX = "linux-amd64",
  LINUX_ARM64 = "linux-aarch64",
  WINDOWS = "windows-amd64",
  MACOS = "macosx-amd64",
  WASM = "wasm",
}

interface CompilerBuild {
  path: string;
  version: string;
  longVersion: string;
  sha256: string;
}

interface CompilerList {
  builds: CompilerBuild[];
  releases: { [version: string]: string };
  latestRelease: string;
}

/**
 * A compiler downloader which must be specialized per-platform. It can't and
 * shouldn't support multiple platforms at the same time.
 *
 * This is expected to be used like this:
 *    1. First, the downloader is created for the given platform.
 *    2. Then, call `downloader.updateCompilerListIfNeeded(versionsToUse)` to
 *       update the compiler list if one of the versions is not found.
 *    3. Then, call `downloader.isCompilerDownloaded()` to check if the
 *       compiler is already downloaded.
 *    4. If the compiler is not downloaded, call
 *       `downloader.downloadCompiler()` to download it.
 *    5. Finally, call `downloader.getCompiler()` to get the compiler.
 *
 * Important things to note:
 *   1. If a compiler version is not found, this downloader may fail.
 *      1.1.1 If a user tries to download a new compiler before X amount of time
 *      has passed since its release, they may need to clean the cache, as
 *      indicated in the error messages.
 */
export interface CompilerDownloader {
  /**
   * Updates the compiler list if any of the versions is not found in the
   * currently downloaded list, or if none has been downloaded yet.
   */
  updateCompilerListIfNeeded(versions: Set<string>): Promise<void>;

  /**
   * Returns true if the compiler has been downloaded.
   *
   * This function access the filesystem, but doesn't modify it.
   */
  isCompilerDownloaded(version: string): Promise<boolean>;

  /**
   * Downloads the compiler for a given version, which can later be obtained
   * with getCompiler.
   *
   * @returns `true` if the compiler was downloaded and verified correctly,
   * including validating the checksum and if the native compiler can be run.
   */
  downloadCompiler(version: string): Promise<boolean>;

  /**
   * Returns the compiler, which MUST be downloaded before calling this function.
   *
   * Returns undefined if the compiler has been downloaded but can't be run.
   *
   * This function access the filesystem, but doesn't modify it.
   */
  getCompiler(version: string): Promise<Compiler | undefined>;
}

/**
 * Default implementation of CompilerDownloader.
 */
export class CompilerDownloaderImplementation implements CompilerDownloader {
  public static getCompilerPlatform(): CompilerPlatform {
    // TODO: This check is seriously wrong. It doesn't take into account
    //  the architecture nor the toolchain. This should check the triplet of
    //  system instead (see: https://wiki.osdev.org/Target_Triplet).
    //
    //  The only reason this downloader works is that it validates if the
    //  binaries actually run.
    //
    //  On top of that, AppleSilicon with Rosetta2 makes things even more
    //  complicated, as it allows x86 binaries to run on ARM, not on MacOS but
    //  on Linux Docker containers too!

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- Ignore other platforms
    switch (os.platform()) {
      case "win32":
        return CompilerPlatform.WINDOWS;
      case "linux":
        if (os.arch() === "arm64") {
          return CompilerPlatform.LINUX_ARM64;
        } else {
          return CompilerPlatform.LINUX;
        }
      case "darwin":
        return CompilerPlatform.MACOS;
      default:
        return CompilerPlatform.WASM;
    }
  }

  readonly #platform: CompilerPlatform;
  readonly #compilersDir: string;
  readonly #downloadFunction: typeof download;

  readonly #mutexCompiler = new MultiProcessMutex("compiler-download");
  readonly #mutexCompilerList = new MultiProcessMutex("compiler-download-list");

  /**
   * Use CompilerDownloader.getConcurrencySafeDownloader instead
   */
  constructor(
    platform: CompilerPlatform,
    compilersDir: string,
    downloadFunction: typeof download = download,
  ) {
    this.#platform = platform;
    this.#compilersDir = compilersDir;
    this.#downloadFunction = downloadFunction;
  }

  public async updateCompilerListIfNeeded(
    versions: Set<string>,
  ): Promise<void> {
    await this.#mutexCompilerList.use(async () => {
      if (await this.#shouldDownloadCompilerList(versions)) {
        try {
          log(
            `Downloading the list of solc builds for platform ${this.#platform}`,
          );
          await this.#downloadCompilerList();
        } catch (e) {
          ensureError(e);

          throw new HardhatError(
            HardhatError.ERRORS.CORE.SOLIDITY.VERSION_LIST_DOWNLOAD_FAILED,
            e,
          );
        }
      }
    });
  }

  public async isCompilerDownloaded(version: string): Promise<boolean> {
    const build = await this.#getCompilerBuild(version);

    const downloadPath = this.#getCompilerBinaryPathFromBuild(build);

    return exists(downloadPath);
  }

  public async downloadCompiler(version: string): Promise<boolean> {
    // Since only one process at a time can acquire the mutex, we avoid the risk of downloading the same compiler multiple times.
    // This is because the mutex blocks access until a compiler has been fully downloaded, preventing any new process
    // from checking whether that version of the compiler exists. Without mutex it might incorrectly
    // return false, indicating that the compiler isn't present, even though it is currently being downloaded.
    return this.#mutexCompiler.use(async () => {
      const isCompilerDownloaded = await this.isCompilerDownloaded(version);

      if (isCompilerDownloaded === true) {
        return true;
      }

      const build = await this.#getCompilerBuild(version);

      let downloadPath: string;
      try {
        downloadPath = await this.#downloadCompiler(build);
      } catch (e) {
        ensureError(e);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.DOWNLOAD_FAILED,
          {
            remoteVersion: build.longVersion,
          },
          e,
        );
      }

      const verified = await this.#verifyCompilerDownload(build, downloadPath);
      if (!verified) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_DOWNLOAD,
          {
            remoteVersion: build.longVersion,
          },
        );
      }

      return this.#postProcessCompilerDownload(build, downloadPath);
    });
  }

  public async getCompiler(version: string): Promise<Compiler | undefined> {
    const build = await this.#getCompilerBuild(version);

    assertHardhatInvariant(
      build !== undefined,
      `Trying to get a compiler ${version} before it was downloaded`,
    );

    const compilerPath = this.#getCompilerBinaryPathFromBuild(build);

    assertHardhatInvariant(
      await exists(compilerPath),
      `Trying to get a compiler ${version} before it was downloaded`,
    );

    if (await exists(this.#getCompilerDoesNotWorkFile(build))) {
      return undefined;
    }

    if (this.#platform === CompilerPlatform.WASM) {
      return new SolcJsCompiler(version, build.longVersion, compilerPath);
    }

    return new NativeCompiler(version, build.longVersion, compilerPath);
  }

  async #getCompilerBuild(version: string): Promise<CompilerBuild> {
    const listPath = this.#getCompilerListPath();
    assertHardhatInvariant(
      await exists(listPath),
      `Trying to get the compiler list for ${this.#platform} before it was downloaded`,
    );

    const list = await this.#readCompilerList(listPath);

    const build = list.builds.find((b) => b.version === version);

    if (build === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
        {
          version,
        },
      );
    }

    return build;
  }

  #getCompilerListPath(): string {
    return path.join(this.#compilersDir, this.#platform, "list.json");
  }

  async #readCompilerList(listPath: string): Promise<CompilerList> {
    return readJsonFile(listPath);
  }

  #getCompilerDownloadPathFromBuild(build: CompilerBuild): string {
    return path.join(this.#compilersDir, this.#platform, build.path);
  }

  #getCompilerBinaryPathFromBuild(build: CompilerBuild): string {
    const downloadPath = this.#getCompilerDownloadPathFromBuild(build);

    if (
      this.#platform !== CompilerPlatform.WINDOWS ||
      !downloadPath.endsWith(".zip")
    ) {
      return downloadPath;
    }

    return path.join(this.#compilersDir, build.version, "solc.exe");
  }

  #getCompilerDoesNotWorkFile(build: CompilerBuild): string {
    return `${this.#getCompilerBinaryPathFromBuild(build)}.does.not.work`;
  }

  async #shouldDownloadCompilerList(versions: Set<string>): Promise<boolean> {
    const listPath = this.#getCompilerListPath();

    log(
      `Checking if the compiler list for ${this.#platform} should be downloaded at ${listPath}`,
    );

    if (!(await exists(listPath))) {
      return true;
    }

    const list = await this.#readCompilerList(listPath);

    const listVersions = new Set(list.builds.map((b) => b.version));

    for (const version of versions) {
      if (!listVersions.has(version)) {
        // TODO: We should also check if it wasn't downloaded soon ago
        return true;
      }
    }

    return false;
  }

  async #downloadCompilerList(): Promise<void> {
    log(`Downloading compiler list for platform ${this.#platform}`);
    let url: string;

    if (this.#onLinuxArm()) {
      url = `${LINUX_ARM64_REPOSITORY_URL}/list.json`;
    } else {
      url = `${COMPILER_REPOSITORY_URL}/${this.#platform}/list.json`;
    }
    const downloadPath = this.#getCompilerListPath();

    await this.#downloadFunction(url, downloadPath);

    // If using the arm64 binary mirror, the list.json file has different information than the solc official mirror, so we complete it
    if (this.#onLinuxArm()) {
      const compilerList: CompilerList = await readJsonFile(downloadPath);
      for (const build of compilerList.builds) {
        build.path = `solc-v${build.version}`;
        build.longVersion = build.version;
      }

      await writeJsonFile(downloadPath, compilerList);
    }
  }

  #onLinuxArm() {
    return this.#platform === CompilerPlatform.LINUX_ARM64;
  }

  async #downloadCompiler(build: CompilerBuild): Promise<string> {
    log(`Downloading compiler ${build.longVersion}`);

    let url: string;

    if (this.#onLinuxArm()) {
      url = `${LINUX_ARM64_REPOSITORY_URL}/${build.path}`;
    } else {
      url = `${COMPILER_REPOSITORY_URL}/${this.#platform}/${build.path}`;
    }

    const downloadPath = this.#getCompilerDownloadPathFromBuild(build);

    await this.#downloadFunction(url, downloadPath);

    return downloadPath;
  }

  async #verifyCompilerDownload(
    build: CompilerBuild,
    downloadPath: string,
  ): Promise<boolean> {
    const expectedSha = getPrefixedHexString(build.sha256);
    const compiler = await readBinaryFile(downloadPath);

    const compilerSha = bytesToHexString(await sha256(compiler));

    if (expectedSha !== compilerSha) {
      await remove(downloadPath);
      return false;
    }

    return true;
  }

  async #postProcessCompilerDownload(
    build: CompilerBuild,
    downloadPath: string,
  ): Promise<boolean> {
    if (this.#platform === CompilerPlatform.WASM) {
      return true;
    }

    if (
      this.#platform === CompilerPlatform.LINUX ||
      this.#platform === CompilerPlatform.LINUX_ARM64 ||
      this.#platform === CompilerPlatform.MACOS
    ) {
      await chmod(downloadPath, 0o755);
    } else if (
      this.#platform === CompilerPlatform.WINDOWS &&
      downloadPath.endsWith(".zip")
    ) {
      // some window builds are zipped, some are not
      const { default: AdmZip } = await import("adm-zip");

      const solcFolder = path.join(this.#compilersDir, build.version);
      await ensureDir(solcFolder);

      const zip = new AdmZip(downloadPath);
      zip.extractAllTo(solcFolder);
    }

    log("Checking native solc binary");
    const nativeSolcWorks = await this.#checkNativeSolc(build);

    if (nativeSolcWorks) {
      return true;
    }

    await createFile(this.#getCompilerDoesNotWorkFile(build));

    return false;
  }

  async #checkNativeSolc(build: CompilerBuild): Promise<boolean> {
    const solcPath = this.#getCompilerBinaryPathFromBuild(build);
    const execFileP = promisify(execFile);

    try {
      await execFileP(solcPath, ["--version"]);
      return true;
    } catch {
      log(`solc binary at ${solcPath} is not working`);
      return false;
    }
  }
}
