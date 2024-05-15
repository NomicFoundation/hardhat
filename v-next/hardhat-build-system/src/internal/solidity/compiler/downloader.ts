import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";
import { keccak256 } from "@nomicfoundation/hardhat-utils/crypto";
import debug from "debug";
import fsExtra from "fs-extra";

import { ERRORS } from "../../errors/errors-list.js";
import { HardhatError, assertHardhatInvariant } from "../../errors/errors.js";
import { download } from "../../utils/download.js";
import { MultiProcessMutex } from "../../utils/multi-process-mutex.js";

const log = debug("hardhat:core:solidity:downloader");

const COMPILER_REPOSITORY_URL = "https://binaries.soliditylang.org";

export enum CompilerPlatform {
  LINUX = "linux-amd64",
  WINDOWS = "windows-amd64",
  MACOS = "macosx-amd64",
  WASM = "wasm",
}

export interface Compiler {
  version: string;
  longVersion: string;
  compilerPath: string;
  isSolcJs: boolean;
}

interface CompilerBuild {
  path: string;
  version: string;
  build: string;
  longVersion: string;
  keccak256: string;
  urls: string[];
  platform: CompilerPlatform;
}

interface CompilerList {
  builds: CompilerBuild[];
  releases: { [version: string]: string };
  latestRelease: string;
}

/**
 * A compiler downloader which must be specialized per-platform. It can't and
 * shouldn't support multiple platforms at the same time.
 */
export interface ICompilerDownloader {
  /**
   * Returns true if the compiler has been downloaded.
   *
   * This function access the filesystem, but doesn't modify it.
   */
  isCompilerDownloaded(version: string): Promise<boolean>;

  /**
   * Downloads the compiler for a given version, which can later be obtained
   * with getCompiler.
   */
  downloadCompiler(
    version: string,
    downloadStartedCb: (isCompilerDownloaded: boolean) => Promise<any>,
    downloadEndedCb: (isCompilerDownloaded: boolean) => Promise<any>,
  ): Promise<void>;

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
 * Default implementation of ICompilerDownloader.
 *
 * Important things to note:
 *   1. If a compiler version is not found, this downloader may fail.
 *    1.1. It only re-downloads the list of compilers once every X time.
 *      1.1.1 If a user tries to download a new compiler before X amount of time
 *      has passed since its release, they may need to clean the cache, as
 *      indicated in the error messages.
 */
export class CompilerDownloader implements ICompilerDownloader {
  public static getCompilerPlatform(): CompilerPlatform {
    // TODO: This check is seriously wrong. It doesn't take into account
    //  the architecture nor the toolchain. This should check the triplet of
    //  system instead (see: https://wiki.osdev.org/Target_Triplet).
    //
    //  The only reason this downloader works is that it validates if the
    //  binaries actually run.
    switch (os.platform()) {
      case "win32":
        return CompilerPlatform.WINDOWS;
      case "linux":
        return CompilerPlatform.LINUX;
      case "darwin":
        return CompilerPlatform.MACOS;
      default:
        return CompilerPlatform.WASM;
    }
  }

  static readonly #downloaderPerPlatform: Map<string, CompilerDownloader> =
    new Map();

  public static getConcurrencySafeDownloader(
    platform: CompilerPlatform,
    compilersDir: string,
  ): CompilerDownloader {
    const key = platform + compilersDir;
    let downloader = this.#downloaderPerPlatform.get(key);

    if (downloader === undefined) {
      downloader = new CompilerDownloader(platform, compilersDir);
      this.#downloaderPerPlatform.set(key, downloader);
    }

    return downloader;
  }

  public static defaultCompilerListCachePeriod = 3_600_00;
  readonly #platform: CompilerPlatform;
  readonly #compilersDir: string;
  readonly #compilerListCachePeriodMs;
  readonly #downloadFunction: typeof download;
  readonly #mutex = new MultiProcessMutex("compiler-download");

  /**
   * Use CompilerDownloader.getConcurrencySafeDownloader instead
   */
  constructor(
    _platform: CompilerPlatform,
    _compilersDir: string,
    _compilerListCachePeriodMs = CompilerDownloader.defaultCompilerListCachePeriod,
    _downloadFunction: typeof download = download,
  ) {
    this.#platform = _platform;
    this.#compilersDir = _compilersDir;
    this.#compilerListCachePeriodMs = _compilerListCachePeriodMs;
    this.#downloadFunction = _downloadFunction;
  }

  public async isCompilerDownloaded(version: string): Promise<boolean> {
    const build = await this.#getCompilerBuild(version);

    if (build === undefined) {
      return false;
    }

    const downloadPath = this.#getCompilerBinaryPathFromBuild(build);

    return fsExtra.pathExists(downloadPath);
  }

  public async downloadCompiler(
    version: string,
    downloadStartedCb: (isCompilerDownloaded: boolean) => Promise<any>,
    downloadEndedCb: (isCompilerDownloaded: boolean) => Promise<any>,
  ): Promise<void> {
    // Since only one process at a time can acquire the mutex, we avoid the risk of downloading the same compiler multiple times.
    // This is because the mutex blocks access until a compiler has been fully downloaded, preventing any new process
    // from checking whether that version of the compiler exists. Without mutex it might incorrectly
    // return false, indicating that the compiler isn't present, even though it is currently being downloaded.
    await this.#mutex.use(async () => {
      const isCompilerDownloaded = await this.isCompilerDownloaded(version);

      if (isCompilerDownloaded === true) {
        return;
      }

      await downloadStartedCb(isCompilerDownloaded);

      let build = await this.#getCompilerBuild(version);

      if (build === undefined && (await this.#shouldDownloadCompilerList())) {
        try {
          await this.#downloadCompilerList();
        } catch (e: any) {
          throw new HardhatError(
            ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED,
            {},
            e,
          );
        }

        build = await this.#getCompilerBuild(version);
      }

      if (build === undefined) {
        throw new HardhatError(ERRORS.SOLC.INVALID_VERSION, { version });
      }

      let downloadPath: string;
      try {
        downloadPath = await this.#downloadCompiler(build);
      } catch (e: any) {
        throw new HardhatError(
          ERRORS.SOLC.DOWNLOAD_FAILED,
          {
            remoteVersion: build.longVersion,
          },
          e,
        );
      }

      const verified = await this.#verifyCompilerDownload(build, downloadPath);
      if (!verified) {
        throw new HardhatError(ERRORS.SOLC.INVALID_DOWNLOAD, {
          remoteVersion: build.longVersion,
        });
      }

      await this.#postProcessCompilerDownload(build, downloadPath);

      await downloadEndedCb(isCompilerDownloaded);
    });
  }

  public async getCompiler(version: string): Promise<Compiler | undefined> {
    const build = await this.#getCompilerBuild(version);

    assertHardhatInvariant(
      build !== undefined,
      "Trying to get a compiler before it was downloaded",
    );

    const compilerPath = this.#getCompilerBinaryPathFromBuild(build);

    assertHardhatInvariant(
      await fsExtra.pathExists(compilerPath),
      "Trying to get a compiler before it was downloaded",
    );

    if (await fsExtra.pathExists(this.#getCompilerDoesntWorkFile(build))) {
      return undefined;
    }

    return {
      version,
      longVersion: build.longVersion,
      compilerPath,
      isSolcJs: this.#platform === CompilerPlatform.WASM,
    };
  }

  async #getCompilerBuild(version: string): Promise<CompilerBuild | undefined> {
    const listPath = this.#getCompilerListPath();
    if (!(await fsExtra.pathExists(listPath))) {
      return undefined;
    }

    const list = await this.#readCompilerList(listPath);
    return list.builds.find((b) => b.version === version);
  }

  #getCompilerListPath(): string {
    return path.join(this.#compilersDir, this.#platform, "list.json");
  }

  async #readCompilerList(listPath: string): Promise<CompilerList> {
    return fsExtra.readJSON(listPath);
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

  #getCompilerDoesntWorkFile(build: CompilerBuild): string {
    return `${this.#getCompilerBinaryPathFromBuild(build)}.does.not.work`;
  }

  async #shouldDownloadCompilerList(): Promise<boolean> {
    const listPath = this.#getCompilerListPath();
    if (!(await fsExtra.pathExists(listPath))) {
      return true;
    }

    const stats = await fsExtra.stat(listPath);
    const age = new Date().valueOf() - stats.ctimeMs;

    return age > this.#compilerListCachePeriodMs;
  }

  async #downloadCompilerList(): Promise<void> {
    log(`Downloading compiler list for platform ${this.#platform}`);
    const url = `${COMPILER_REPOSITORY_URL}/${this.#platform}/list.json`;
    const downloadPath = this.#getCompilerListPath();

    await this.#downloadFunction(url, downloadPath);
  }

  async #downloadCompiler(build: CompilerBuild): Promise<string> {
    log(`Downloading compiler ${build.longVersion}`);
    const url = `${COMPILER_REPOSITORY_URL}/${this.#platform}/${build.path}`;
    const downloadPath = this.#getCompilerDownloadPathFromBuild(build);

    await this.#downloadFunction(url, downloadPath);

    return downloadPath;
  }

  async #verifyCompilerDownload(
    build: CompilerBuild,
    downloadPath: string,
  ): Promise<boolean> {
    const expectedKeccak256 = build.keccak256;
    const compiler = await fsExtra.readFile(downloadPath);

    const compilerKeccak256 = bytesToHexString(await keccak256(compiler));

    if (expectedKeccak256 !== compilerKeccak256) {
      await fsExtra.unlink(downloadPath);
      return false;
    }

    return true;
  }

  async #postProcessCompilerDownload(
    build: CompilerBuild,
    downloadPath: string,
  ): Promise<void> {
    if (this.#platform === CompilerPlatform.WASM) {
      return;
    }

    if (
      this.#platform === CompilerPlatform.LINUX ||
      this.#platform === CompilerPlatform.MACOS
    ) {
      fsExtra.chmodSync(downloadPath, 0o755);
    } else if (
      this.#platform === CompilerPlatform.WINDOWS &&
      downloadPath.endsWith(".zip")
    ) {
      // some window builds are zipped, some are not
      const { default: AdmZip } = await import("adm-zip");

      const solcFolder = path.join(this.#compilersDir, build.version);
      await fsExtra.ensureDir(solcFolder);

      const zip = new AdmZip(downloadPath);
      zip.extractAllTo(solcFolder);
    }

    log("Checking native solc binary");
    const nativeSolcWorks = await this.#checkNativeSolc(build);

    if (nativeSolcWorks) {
      return;
    }

    await fsExtra.createFile(this.#getCompilerDoesntWorkFile(build));
  }

  async #checkNativeSolc(build: CompilerBuild): Promise<boolean> {
    const solcPath = this.#getCompilerBinaryPathFromBuild(build);
    const execFileP = promisify(execFile);

    try {
      await execFileP(solcPath, ["--version"]);
      return true;
    } catch {
      return false;
    }
  }
}
