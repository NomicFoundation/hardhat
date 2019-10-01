import fsExtra from "fs-extra";
import path from "path";

import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";

export interface CompilerBuild {
  path: string;
  version: string;
  build: string;
  longVersion: string;
  keccak256: string;
  urls: string[];
}

export interface CompilersList {
  builds: CompilerBuild[];
  releases: {
    [version: string]: string;
  };
  latestRelease: string;
}

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = `${COMPILER_FILES_DIR_URL}list.json`;

async function downloadFile(
  url: string,
  destinationFile: string
): Promise<void> {
  // This library indirectly validates the TLS certs, if it didn't this
  // would be MITM-able.
  const { default: download } = await import("download");
  await download(url, path.dirname(destinationFile), {
    filename: path.basename(destinationFile)
  });
}

export class CompilerDownloader {
  private readonly _compilersDir: string;
  private readonly _localSolcVersion: string;
  private readonly _download: (
    url: string,
    destinationFile: string
  ) => Promise<void>;

  constructor(
    readonly compilersDir: string,
    readonly localSolcVersion: string,
    readonly download = downloadFile
  ) {
    this._compilersDir = compilersDir;
    this._localSolcVersion = localSolcVersion;
    this._download = download;
  }

  public async getDownloadedCompilerPath(version: string): Promise<string> {
    const compilerBuild = await this.getCompilerBuild(version);
    const downloadedFilePath = path.join(
      this._compilersDir,
      compilerBuild.path
    );

    if (!(await this._fileExists(downloadedFilePath))) {
      await this.downloadCompiler(compilerBuild, downloadedFilePath);
    }

    await this.verifyCompiler(compilerBuild, downloadedFilePath);

    return downloadedFilePath;
  }

  public async getCompilerBuild(version: string): Promise<CompilerBuild> {
    const compilersListExisted = await this.compilersListExists();

    let list = await this.getCompilersList();
    let compilerBuildPath = list.releases[version];

    // We may need to re-download the compilers list.
    if (compilerBuildPath === undefined && compilersListExisted) {
      await fsExtra.unlink(this.getCompilersListPath());

      list = await this.getCompilersList();
      compilerBuildPath = list.releases[version];
    }

    const compilerBuild = list.builds.find(b => b.path === compilerBuildPath);

    if (compilerBuild === undefined) {
      throw new BuidlerError(ERRORS.SOLC.INVALID_VERSION, { version });
    }

    return compilerBuild;
  }

  public async getCompilersList(): Promise<CompilersList> {
    if (!(await this.compilersListExists())) {
      await this.downloadCompilersList();
    }

    return fsExtra.readJson(this.getCompilersListPath());
  }

  public getCompilersListPath() {
    return path.join(this._compilersDir, "list.json");
  }

  public async compilersListExists() {
    return fsExtra.pathExists(this.getCompilersListPath());
  }

  public async downloadCompilersList() {
    try {
      await this._download(COMPILERS_LIST_URL, this.getCompilersListPath());
    } catch (error) {
      throw new BuidlerError(
        ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED,
        {
          localVersion: this._localSolcVersion
        },
        error
      );
    }
  }

  public async downloadCompiler(
    compilerBuild: CompilerBuild,
    downloadedFilePath: string
  ) {
    console.debug(`Downloading compiler version ${compilerBuild.version}`);

    const compilerUrl = COMPILER_FILES_DIR_URL + compilerBuild.path;

    try {
      await this._download(compilerUrl, downloadedFilePath);
    } catch (error) {
      throw new BuidlerError(
        ERRORS.SOLC.DOWNLOAD_FAILED,
        {
          remoteVersion: compilerBuild.version,
          localVersion: this._localSolcVersion
        },
        error
      );
    }
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

      throw new BuidlerError(ERRORS.SOLC.INVALID_DOWNLOAD, {
        remoteVersion: compilerBuild.version,
        localVersion: this._localSolcVersion
      });
    }
  }

  private async _fileExists(filePath: string) {
    return fsExtra.pathExists(filePath);
  }
}
