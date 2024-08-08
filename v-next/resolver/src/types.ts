export interface Remapping {
  context: string;
  prefix: string;
  target: string;
}

export enum ResolvedFileType {
  PROJECT_FILE = "PROJECT_FILE",
  NPM_PACKGE_FILE = "NPM_PACKAGE_FILE",
}

export interface ProjectResolvedFile {
  type: ResolvedFileType.PROJECT_FILE;
  sourceName: string;
  path: string;
  content: string;
}

export interface ResolvedNpmPackage {
  name: string;
  version: string;
  rootPath: string;
  rootSourceName: string;
}

export interface NpmPackageResolvedFile {
  type: ResolvedFileType.NPM_PACKGE_FILE;
  sourceName: string;
  path: string;
  content: string;
  package: ResolvedNpmPackage;
}

export type ResolvedFile = ProjectResolvedFile | NpmPackageResolvedFile;

export interface Resolver {
  resolveProjectFile(absoluteFilePath: string): Promise<ProjectResolvedFile>;
  resolveImport(from: ResolvedFile, importPath: string): Promise<ResolvedFile>;
  getRemappings(): Remapping[];
}
