/**
 * The type of the root name.
 */
export enum RootType {
  PROJECT_FILE = "PROJECT_FILE",
  NPM_PACKAGE_FILE = "NPM_PACKAGE_FILE",
}

/**
 * The root name of a project file, which includes its absolute path.
 */
export interface ProjectFileRootName {
  type: RootType.PROJECT_FILE;
  absolutePath: string;
}

/**
 * The root name of an npm package file, which includes the module name that
 * would be used to import it.
 *
 * npm root files must be part of a direct dependency of the project, and
 * can be affected by user remappings.
 */
export interface NpmPackageFileRootName {
  type: RootType.NPM_PACKAGE_FILE;
  moduleName: string;
}

/**
 * A root name is the identifierof a file when treated as a root of the
 * dependency graph.
 *
 * This doesn't always match its source name nor its absolute path, as it can
 * be a file imported through npm, and potentially remapped.
 */
export type RootName = ProjectFileRootName | NpmPackageFileRootName;
