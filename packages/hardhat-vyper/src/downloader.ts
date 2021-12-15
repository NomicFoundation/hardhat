import os from "os";
import path from "path";
import fsExtra from "fs-extra";
import semver from "semver";

import { CompilerReleaseAsset, CompilersList, CompilerPlatform } from "./types";
import { GITHUB_RELEASES_URL } from "./constants";
import { VyperPluginError, getLogger, deepCamel } from "./util";

const log = getLogger("downloader");

async function downloadFile(
  url: string,
  destinationFile: string
): Promise<void> {
  const { download } = await import("hardhat/internal/util/download");
  log(`Downloading from ${url} to ${destinationFile}`);
  await download(url, destinationFile, undefined, (output) => {
    const parsedOutput = JSON.parse(output);
    const camelCased = deepCamel(parsedOutput);
    return JSON.stringify(camelCased);
  });
}

type DownloadFunction = (url: string, destinationFile: string) => Promise<void>;

interface CompilerDownloaderOptions {
  download?: DownloadFunction;
}

export class CompilerDownloader {
  private readonly _download: DownloadFunction;
  private readonly _platform: CompilerPlatform;

  constructor(
    private readonly _compilersDir: string,
    options: CompilerDownloaderOptions = {}
  ) {
    this._download = options.download ?? downloadFile;
    this._platform = this._getCurrentPlatform();
  }

  public get compilersListExists(): boolean {
    return fsExtra.pathExistsSync(this.compilersListPath);
  }

  public get downloadsDir(): string {
    return path.join(this._compilersDir, "vyper", this._platform);
  }

  public get compilersListPath(): string {
    return path.join(this.downloadsDir, "list.json");
  }

  public async isCompilerDownloaded(version: string): Promise<boolean> {
    const compilerAsset = await this.getCompilerAsset(version);
    const downloadedFilePath = this._getDownloadedFilePath(compilerAsset);

    return this._fileExists(downloadedFilePath);
  }

  public async getCompilerAsset(
    version: string
  ): Promise<CompilerReleaseAsset> {
    await this._ensureCompilersListExists();

    const list = await this.getCompilersList();
    const versionRelease = list.find((release) =>
      semver.eq(release.tagName, version)
    );

    if (versionRelease === undefined) {
      throw new VyperPluginError(`Unsupported vyper version: ${version}`);
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
      const compilerAsset = await this.getCompilerAsset(version);

      const downloadedFilePath = this._getDownloadedFilePath(compilerAsset);

      if (!this._fileExists(downloadedFilePath)) {
        await this._downloadCompiler(compilerAsset, downloadedFilePath);
      }

      if (this._isUnix) {
        fsExtra.chmodSync(downloadedFilePath, 0o755);
      }

      return downloadedFilePath;
    } catch (e: unknown) {
      throw new VyperPluginError(
        "An unexpected error occurred",
        e as Error,
        true
      );
    }
  }

  public async downloadReleaseList(): Promise<void> {
    try {
      await this._download(GITHUB_RELEASES_URL, this.compilersListPath);
    } catch {
      throw new VyperPluginError(
        "Failed to download complier list",
        undefined,
        true
      );
    }
  }

  public async getCompilersList(): Promise<CompilersList> {
    return fsExtra.readJson(this.compilersListPath);
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

    try {
      await this._download(
        compilerAsset.browserDownloadUrl,
        downloadedFilePath
      );
    } catch (e: unknown) {
      throw new VyperPluginError("Compiler download failed", e as Error);
    }
  }

  private async _ensureCompilersListExists(): Promise<void> {
    if (!this.compilersListExists) {
      await this.downloadReleaseList();
    }
  }

  private _getDownloadedFilePath(compilerAsset: CompilerReleaseAsset): string {
    return path.join(this.downloadsDir, compilerAsset.name);
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
