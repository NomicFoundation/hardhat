import os from "os";
import path from "path";
import fsExtra from "fs-extra";
import semver from "semver";

import {
  CompilerReleaseAsset,
  CompilersList,
  CompilerPlatform,
  CompilerRelease,
} from "./types";
import { VyperPluginError, getLogger } from "./util";

const log = getLogger("downloader");

const VYPER_RELEASES_MIRROR_URL = "https://vyper-releases-mirror.hardhat.org";
const DOWNLOAD_TIMEOUT_MS = 30_000;

async function downloadFile(
  url: string,
  destinationFile: string
): Promise<void> {
  const { download } = await import("hardhat/internal/util/download");
  log(`Downloading from ${url} to ${destinationFile}`);
  await download(url, destinationFile, DOWNLOAD_TIMEOUT_MS);
}

type DownloadFunction = (url: string, destinationFile: string) => Promise<void>;

interface CompilerDownloaderOptions {
  download?: DownloadFunction;
}

export class CompilerDownloader {
  private readonly _download: DownloadFunction;
  private readonly _platform: CompilerPlatform;
  public compilersList: CompilersList = [];

  constructor(
    private readonly _compilersDir: string,
    options: CompilerDownloaderOptions = {}
  ) {
    this._download = options.download ?? downloadFile;
    this._platform = this._getCurrentPlatform();
  }

  public get compilersListExists(): boolean {
    return this._fileExists(this.compilersListPath);
  }

  public get downloadsDir(): string {
    return path.join(this._compilersDir, "vyper", this._platform);
  }

  public get compilersListPath(): string {
    return path.join(this.downloadsDir, "list.json");
  }

  public isCompilerDownloaded(version: string): boolean {
    return this._fileExists(this._getDownloadedFilePath(version));
  }

  public async initCompilersList(
    { forceDownload } = { forceDownload: false }
  ): Promise<void> {
    if (forceDownload || !this.compilersListExists) {
      await this._downloadCompilersList();
    }

    this.compilersList = this._getCompilersListFromDisk();
  }

  public async getCompilerAsset(
    version: string
  ): Promise<CompilerReleaseAsset> {
    let versionRelease = this._findVersionRelease(version);

    if (versionRelease === undefined) {
      await this.initCompilersList({ forceDownload: true });
      versionRelease = this._findVersionRelease(version);

      if (versionRelease === undefined) {
        throw new VyperPluginError(`Unsupported vyper version: ${version}`);
      }
    }

    const compilerAsset = versionRelease.assets.find((asset) =>
      asset.name.includes(this._platform)
    );

    if (compilerAsset === undefined) {
      throw new VyperPluginError(
        `Vyper version ${version} is not supported on platform ${this._platform}`
      );
    }

    return compilerAsset;
  }

  public async getOrDownloadCompiler(
    version: string
  ): Promise<string | undefined> {
    try {
      const downloadedFilePath = this._getDownloadedFilePath(version);

      if (!this._fileExists(downloadedFilePath)) {
        const compilerAsset = await this.getCompilerAsset(version);
        await this._downloadCompiler(compilerAsset, downloadedFilePath);
      }

      if (this._isUnix) {
        fsExtra.chmodSync(downloadedFilePath, 0o755);
      }

      return downloadedFilePath;
    } catch (e: unknown) {
      if (VyperPluginError.isNomicLabsHardhatPluginError(e)) {
        throw e;
      } else {
        throw new VyperPluginError(
          "An unexpected error occurred",
          e as Error,
          true
        );
      }
    }
  }

  private _findVersionRelease(version: string): CompilerRelease | undefined {
    return this.compilersList.find(
      (release) =>
        semver.valid(release.tag_name) !== null &&
        semver.eq(release.tag_name, version)
    );
  }

  private async _downloadCompilersList(): Promise<void> {
    try {
      await this._download(
        `${VYPER_RELEASES_MIRROR_URL}/list.json`,
        this.compilersListPath
      );
    } catch (e: unknown) {
      throw new VyperPluginError(
        "Failed to download compiler list",
        e as Error,
        true
      );
    }
  }

  private _getCompilersListFromDisk(): CompilersList {
    return fsExtra.readJSONSync(this.compilersListPath);
  }

  private get _isUnix(): boolean {
    return (
      this._platform === CompilerPlatform.MACOS ||
      this._platform === CompilerPlatform.LINUX
    );
  }

  private async _downloadCompiler(
    compilerAsset: CompilerReleaseAsset,
    downloadedFilePath: string
  ): Promise<void> {
    const version = compilerAsset.name.split("+")[0].replace("vyper.", "");
    log(`Downloading compiler version ${version} platform ${this._platform}`);

    const urlParts = compilerAsset.browser_download_url.split("/");
    const mirroredUrl = `${VYPER_RELEASES_MIRROR_URL}/${
      urlParts[urlParts.length - 1]
    }`;

    try {
      await this._download(mirroredUrl, downloadedFilePath);
    } catch (e: unknown) {
      throw new VyperPluginError("Compiler download failed", e as Error);
    }
  }

  private _getDownloadedFilePath(version: string): string {
    return path.join(this.downloadsDir, version);
  }

  private _fileExists(filepath: string): boolean {
    return fsExtra.pathExistsSync(filepath);
  }

  private _getCurrentPlatform(): CompilerPlatform {
    switch (os.platform()) {
      case "win32":
        return CompilerPlatform.WINDOWS;
      case "linux":
        return CompilerPlatform.LINUX;
      case "darwin":
        return CompilerPlatform.MACOS;
      default:
        throw new VyperPluginError(
          `Vyper not supported on platform ${os.platform()}`
        );
    }
  }
}
