import chalk from "chalk";
import debug from "debug";
import fsExtra from "fs-extra";
import os from "os";
import path from "path";

import { HardhatError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";

export interface CompilerBuild {
  path: string;
  version: string;
  build: string;
  longVersion: string;
  keccak256: string;
  urls: string[];
  platform: CompilerPlatform;
}

export enum CompilerPlatform {
  LINUX = "linux-amd64",
  WINDOWS = "windows-amd64",
  MACOS = "macosx-amd64",
  WASM = "wasm",
}

interface CompilerPath {
  compilerPath: string; // absolute path
  platform: CompilerPlatform;
}

export interface CompilersList {
  builds: CompilerBuild[];
  releases: {
    [version: string]: string;
  };
  latestRelease: string;
}

const log = debug("hardhat:core:solidity:downloader");

const COMPILER_FILES_DIR_URL_SOLC = "https://binaries.soliditylang.org/";

async function downloadFile(
  url: string,
  destinationFile: string
): Promise<void> {
  const { download } = await import("../../util/download");
  log(`Downloading from ${url} to ${destinationFile}`);
  await download(url, destinationFile);
}

type CompilerDownloaderOptions = Partial<{
  download: (url: string, destinationFile: string) => Promise<void>;
  forceSolcJs: boolean;
}>;

export class CompilerDownloader {
  private readonly _download: (
    url: string,
    destinationFile: string
  ) => Promise<void>;
  private readonly _forceSolcJs: boolean;

  constructor(
    private readonly _compilersDir: string,
    options: CompilerDownloaderOptions = {}
  ) {
    this._download = options.download ?? downloadFile;
    this._forceSolcJs = options.forceSolcJs ?? false;
  }

  public async isCompilerDownloaded(version: string): Promise<boolean> {
    const compilerBuild = await this.getCompilerBuild(version);
    const downloadedFilePath = this._getDownloadedFilePath(compilerBuild);

    return this._fileExists(downloadedFilePath);
  }

  public async verifyCompiler(
    compilerBuild: CompilerBuild,
    downloadedFilePath: string
  ) {
    const ethereumjsUtil = await import("ethereumjs-util");

    const expectedKeccak256 = compilerBuild.keccak256;
    const compiler = await fsExtra.readFile(downloadedFilePath);

    const compilerKeccak256 = ethereumjsUtil.bufferToHex(
      ethereumjsUtil.keccak(compiler)
    );

    if (expectedKeccak256 !== compilerKeccak256) {
      await fsExtra.unlink(downloadedFilePath);
      await fsExtra.unlink(this.getCompilersListPath(compilerBuild.platform));

      throw new HardhatError(ERRORS.SOLC.INVALID_DOWNLOAD, {
        remoteVersion: compilerBuild.version,
      });
    }
  }

  public async getDownloadedCompilerPath(
    version: string
  ): Promise<CompilerPath | undefined> {
    const { default: AdmZip } = await import("adm-zip");

    try {
      const compilerBuild = await this.getCompilerBuild(version);

      let downloadedFilePath = this._getDownloadedFilePath(compilerBuild);

      if (!(await this._fileExists(downloadedFilePath))) {
        await this.downloadCompiler(compilerBuild, downloadedFilePath);
      }

      await this.verifyCompiler(compilerBuild, downloadedFilePath);

      if (
        compilerBuild.platform === CompilerPlatform.LINUX ||
        compilerBuild.platform === CompilerPlatform.MACOS
      ) {
        fsExtra.chmodSync(downloadedFilePath, 0o755);
      } else if (compilerBuild.platform === CompilerPlatform.WINDOWS) {
        // some window builds are zipped, some are not
        if (downloadedFilePath.endsWith(".zip")) {
          const zip = new AdmZip(downloadedFilePath);
          zip.extractAllTo(
            path.join(this._compilersDir, compilerBuild.version)
          );
          downloadedFilePath = path.join(
            this._compilersDir,
            compilerBuild.version,
            "solc.exe"
          );
        }
      }

      return {
        compilerPath: downloadedFilePath,
        platform: compilerBuild.platform,
      };
    } catch (e) {
      if (e instanceof Error) {
        if (HardhatError.isHardhatError(e)) {
          throw e;
        }
        console.warn(
          chalk.yellow(
            `There was an unexpected problem downloading the compiler: ${e.message}`
          )
        );
      }
    }
  }

  public async getCompilersList(
    platform: CompilerPlatform,
    pendingRetries: number = 3
  ): Promise<CompilersList> {
    if (!(await this.compilersListExists(platform))) {
      await this.downloadCompilersList(platform);
    }

    try {
      return await fsExtra.readJSON(this.getCompilersListPath(platform));
    } catch (error) {
      // if parsing throws a syntax error, redownload and parse once more
      if (!(error instanceof SyntaxError) || pendingRetries === 0) {
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
      }

      // remove the malformed list and retry
      await fsExtra.remove(this.getCompilersListPath(platform));
      return this.getCompilersList(platform, pendingRetries - 1);
    }
  }

  public async getCompilerBuild(version: string): Promise<CompilerBuild> {
    const platform = this._getCurrentPlatform();

    if (await this._versionExists(version, platform)) {
      try {
        return await this._getCompilerBuildByPlatform(version, platform);
      } catch {
        log("Couldn't download native compiler, using solcjs instead");
      }
    }

    return this._getCompilerBuildByPlatform(version, CompilerPlatform.WASM);
  }

  public async downloadCompilersList(
    platform: CompilerPlatform = this._getCurrentPlatform()
  ) {
    try {
      await this._download(
        getCompilerListURL(platform),
        this.getCompilersListPath(platform)
      );
    } catch (error: any) {
      throw new HardhatError(
        ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED,
        {},
        error
      );
    }
  }

  public async downloadCompiler(
    compilerBuild: CompilerBuild,
    downloadedFilePath: string
  ) {
    log(
      `Downloading compiler version ${compilerBuild.version} platform ${compilerBuild.platform}`
    );

    const compilerUrl = getCompilerURL(
      compilerBuild.platform,
      compilerBuild.path
    );

    try {
      await this._download(compilerUrl, downloadedFilePath);
    } catch (error) {
      throw new HardhatError(
        ERRORS.SOLC.DOWNLOAD_FAILED,
        {
          remoteVersion: compilerBuild.version,
        },
        error as Error
      );
    }
  }

  public async compilersListExists(platform: CompilerPlatform) {
    return fsExtra.pathExists(this.getCompilersListPath(platform));
  }

  public getCompilersListPath(platform: CompilerPlatform) {
    return path.join(this._compilersDir, platform, "list.json");
  }

  private _getDownloadedFilePath(compilerBuild: CompilerBuild): string {
    return path.join(
      this._compilersDir,
      compilerBuild.platform,
      compilerBuild.path
    );
  }

  private async _fetchVersionPath(
    version: string,
    platform: CompilerPlatform
  ): Promise<string | undefined> {
    const compilersListExisted = await this.compilersListExists(platform);
    let list = await this.getCompilersList(platform);
    let compilerBuildPath = list.releases[version];

    // We may need to re-download the compilers list.
    if (compilerBuildPath === undefined && compilersListExisted) {
      await fsExtra.unlink(this.getCompilersListPath(platform));

      list = await this.getCompilersList(platform);
      compilerBuildPath = list.releases[version];
    }

    return compilerBuildPath;
  }

  private async _versionExists(
    version: string,
    platform: CompilerPlatform
  ): Promise<boolean> {
    const versionPath = await this._fetchVersionPath(version, platform);
    return versionPath !== undefined;
  }

  private async _getCompilerBuildByPlatform(
    version: string,
    platform: CompilerPlatform
  ): Promise<CompilerBuild> {
    const compilerBuildPath = await this._fetchVersionPath(version, platform);
    const list = await this.getCompilersList(platform);
    const compilerBuild = list.builds.find((b) => b.path === compilerBuildPath);

    if (compilerBuild === undefined) {
      throw new HardhatError(ERRORS.SOLC.INVALID_VERSION, { version });
    }

    compilerBuild.platform = platform;
    return compilerBuild;
  }

  private async _fileExists(filePath: string) {
    return fsExtra.pathExists(filePath);
  }

  private _getCurrentPlatform(): CompilerPlatform {
    if (this._forceSolcJs) {
      return CompilerPlatform.WASM;
    }

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
}

function getCompilerURL(platform: CompilerPlatform, filePath: string) {
  return `${COMPILER_FILES_DIR_URL_SOLC}${platform}/${filePath}`;
}

function getCompilerListURL(platform: CompilerPlatform) {
  return getCompilerURL(platform, "list.json");
}
