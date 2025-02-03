import type {
  FileContent,
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../types/solidity.js";

import { createNonCryptographicHashId } from "@ignored/hardhat-vnext-utils/crypto";

import { ResolvedFileType } from "../../../../types/solidity.js";

export class ProjectResolvedFileImplementation implements ProjectResolvedFile {
  public readonly type: ResolvedFileType.PROJECT_FILE =
    ResolvedFileType.PROJECT_FILE;

  public readonly sourceName: string;
  public readonly fsPath: string;
  public readonly content: FileContent;

  #contentHash?: string;

  constructor(options: Omit<ProjectResolvedFile, "type" | "getContentHash">) {
    this.sourceName = options.sourceName;
    this.fsPath = options.fsPath;
    this.content = options.content;
  }

  public async getContentHash(): Promise<string> {
    if (this.#contentHash === undefined) {
      this.#contentHash = await createNonCryptographicHashId(this.content.text);
    }

    return this.#contentHash;
  }
}

export class NpmPackageResolvedFileImplementation
  implements NpmPackageResolvedFile
{
  public readonly type: ResolvedFileType.NPM_PACKAGE_FILE =
    ResolvedFileType.NPM_PACKAGE_FILE;

  public readonly sourceName: string;
  public readonly fsPath: string;
  public readonly content: FileContent;
  public readonly package: ResolvedNpmPackage;

  #contentHash?: string;

  constructor(
    options: Omit<NpmPackageResolvedFile, "type" | "getContentHash">,
  ) {
    this.sourceName = options.sourceName;
    this.fsPath = options.fsPath;
    this.content = options.content;
    this.package = options.package;
  }

  public async getContentHash(): Promise<string> {
    if (this.#contentHash === undefined) {
      this.#contentHash = await createNonCryptographicHashId(this.content.text);
    }

    return this.#contentHash;
  }
}
