import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
  ResolvedFile,
} from "../../../../../types/solidity/resolved-file.js";

/**
 * A solc remapping.
 */
export interface Remapping {
  context: string;
  prefix: string;
  target: string;
}

/**
 * A Resolver is a stateful object that can be used to to construct a dependency
 * graph, by resolving both the local project and npm files, and their imports.
 *
 * As part of the resolution process, it generates the list of remappings that
 * are needed to build the project.
 *
 * This resolver uses `sourceName`s to identify the resolved files, which are
 * not necessarily related to the file path.
 *
 * The `sourceName` of a Hardhat project file is its relative path from the
 * project root. For example, if the project root is `/home/user/project`, and
 * there are files `/home/user/project/contracts/File.sol` and
 * `home/user/project/File2.sol`, their source names are `contracts/File.sol`
 * and `File2.sol`.
 *
 * The `sourceName` of an npm file is `npm/<package-name>@<version>/<path>`.
 * This is constructed by using the Node.js resolution algorithm, to resolve
 * an npm file or import, and using the package's `package.json` file to
 * determine the source name. For example, if we import `foo/bar.sol`, its
 * source name could be `npm/foo@1.2.3/bar.sol`.
 *
 * If the Node.js resolution algorithm resolve a file into a package that's
 * part of the monorepo where the Hardhat project is (i.e. it's not part of a
 * `node_modules` directory), the source name is going to be
 * `npm/package@local/path/to/file`.
 *
 * Note that in the Node.js ecosystem, a package manager may install multiple
 * instances of the same package and version (i.e. fail to deduplicate them).
 * In those cases the Resolver will use the first instance it finds, and will
 * always resolve to that one.
 *
 * Finally, the current version of the resolver doesn't support npm packages
 * that use `pacakge.json#exports`.
 */
export interface Resolver {
  /**
   * Resolve a Hardhat project file.
   *
   * @param absoluteFilePath The absolute path to the file.
   * @returns The resolved file.
   */
  resolveProjectFile(absoluteFilePath: string): Promise<ProjectResolvedFile>;

  /**
   * Resolves an npm package file, which must be a dependency available in the
   * Hardhat project.
   *
   * This method is only meant to be used when an npm file needs to be rebuilt
   * to emit its artifacts, because the user requested it through their config.
   *
   * @param npmModule The npm module to resolve, in the form of
   * `<package-name>/<file-path>`.
   * @returns The resolved file.
   */
  resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<NpmPackageResolvedFile>;

  /**
   * Resolves an import.
   *
   * @param from The file where the import statement is located.
   * @param importPath The import path, as written in the source code. For
   * example, if the import statement is `import "./foo.sol";`, the import
   * path is `./foo.sol`.
   * @returns The imported file.
   */
  resolveImport(from: ResolvedFile, importPath: string): Promise<ResolvedFile>;

  /**
   * Returns the list of remappings needed to build the project.
   *
   * TODO: Does this include all the user remappings? Only the necessary ones?
   * What if we are only compiling parts of the dependency graph of it?
   */
  getRemappings(): Remapping[];
}
