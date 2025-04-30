import type {
  FileContent,
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedNpmPackage,
} from "../../../../types/solidity.js";

import { ResolvedFileType } from "../../../../types/solidity.js";

export class ProjectResolvedFileImplementation implements ProjectResolvedFile {
  public readonly type: ResolvedFileType.PROJECT_FILE =
    ResolvedFileType.PROJECT_FILE;

  public readonly sourceName: string;
  public readonly fsPath: string;
  public readonly content: FileContent;

  constructor(options: Omit<ProjectResolvedFile, "type">) {
    this.sourceName = options.sourceName;
    this.fsPath = options.fsPath;
    this.content = options.content;
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

  constructor(
    options: Omit<NpmPackageResolvedFile, "type">,
  ) {
    this.sourceName = options.sourceName;
    this.fsPath = options.fsPath;
    this.content = options.content;
    this.package = options.package;
  }
}
