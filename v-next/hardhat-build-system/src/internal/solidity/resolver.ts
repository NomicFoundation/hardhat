import fs from "node:fs/promises";
import path from "node:path";
import resolve from "resolve";
import {
  includesOwnPackageName,
  isAbsolutePathSourceName,
  isLocalSourceName,
  normalizeSourceName,
  replaceBackslashes,
  validateSourceNameExistenceAndCasing,
  validateSourceNameFormat,
} from "../utils/source-names.js";
import { ERRORS } from "../errors/errors-list.js";
import { createNonCryptographicHashBasedIdentifier } from "../utils/hash.js";
import { getRealPath } from "../utils/fs-utils.js";
import { applyRemappings } from "../utils/remappings.js";
import {
  FileContent,
  LibraryInfo,
  ResolvedFile as IResolvedFile,
} from "../types/builtin-tasks/index.js";
import { HardhatError, assertHardhatInvariant } from "../errors/errors.js";
import { Parser } from "./parse.js";

const NODE_MODULES = "node_modules";

export class ResolvedFile implements IResolvedFile {
  public readonly library?: LibraryInfo;

  constructor(
    public readonly sourceName: string,
    public readonly absolutePath: string,
    public readonly content: FileContent,
    public readonly contentHash: string,
    public readonly lastModificationDate: Date,
    libraryName?: string,
    libraryVersion?: string,
  ) {
    assertHardhatInvariant(
      (libraryName === undefined && libraryVersion === undefined) ||
        (libraryName !== undefined && libraryVersion !== undefined),
      "Libraries should have both name and version, or neither one",
    );

    if (libraryName !== undefined && libraryVersion !== undefined) {
      this.library = {
        name: libraryName,
        version: libraryVersion,
      };
    }
  }

  public getVersionedName() {
    return (
      this.sourceName +
      (this.library !== undefined ? `@v${this.library.version}` : "")
    );
  }
}

export class Resolver {
  readonly #projectRoot: string;
  readonly #parser: Parser;
  readonly #remappings: Record<string, string>;
  readonly #readFile: (absolutePath: string) => Promise<string>;
  readonly #transformImportName: (importName: string) => Promise<string>;
  readonly #cache: Map<string, ResolvedFile> = new Map();

  constructor(
    _projectRoot: string,
    _parser: Parser,
    _remappings: Record<string, string>,
    _readFile: (absolutePath: string) => Promise<string>,
    _transformImportName: (importName: string) => Promise<string>,
  ) {
    this.#projectRoot = _projectRoot;
    this.#parser = _parser;
    this.#remappings = _remappings;
    this.#readFile = _readFile;
    this.#transformImportName = _transformImportName;
  }

  /**
   * Resolves a source name into a ResolvedFile.
   *
   * @param sourceName The source name as it would be provided to solc.
   */
  public async resolveSourceName(sourceName: string): Promise<ResolvedFile> {
    const cached = this.#cache.get(sourceName);
    if (cached !== undefined) {
      return cached;
    }

    const remappedSourceName = applyRemappings(this.#remappings, sourceName);

    validateSourceNameFormat(remappedSourceName);

    let resolvedFile: ResolvedFile;

    if (await isLocalSourceName(this.#projectRoot, remappedSourceName)) {
      resolvedFile = await this.#resolveLocalSourceName(
        sourceName,
        remappedSourceName,
      );
    } else {
      resolvedFile = await this.#resolveLibrarySourceName(
        sourceName,
        remappedSourceName,
      );
    }

    this.#cache.set(sourceName, resolvedFile);
    return resolvedFile;
  }

  /**
   * Resolves an import from an already resolved file.
   * @param from The file were the import statement is present.
   * @param importName The path in the import statement.
   */
  public async resolveImport(
    from: ResolvedFile,
    importName: string,
  ): Promise<ResolvedFile> {
    // sanity check for deprecated task
    if (importName !== (await this.#transformImportName(importName))) {
      throw new HardhatError(
        ERRORS.TASK_DEFINITIONS.DEPRECATED_TRANSFORM_IMPORT_TASK,
      );
    }

    const imported = applyRemappings(this.#remappings, importName);

    const scheme = this.#getUriScheme(imported);
    if (scheme !== undefined) {
      throw new HardhatError(ERRORS.RESOLVER.INVALID_IMPORT_PROTOCOL, {
        from: from.sourceName,
        imported,
        protocol: scheme,
      });
    }

    if (replaceBackslashes(imported) !== imported) {
      throw new HardhatError(ERRORS.RESOLVER.INVALID_IMPORT_BACKSLASH, {
        from: from.sourceName,
        imported,
      });
    }

    if (isAbsolutePathSourceName(imported)) {
      throw new HardhatError(ERRORS.RESOLVER.INVALID_IMPORT_ABSOLUTE_PATH, {
        from: from.sourceName,
        imported,
      });
    }

    // Edge-case where an import can contain the current package's name in monorepos.
    // The path can be resolved because there's a symlink in the node modules.
    if (await includesOwnPackageName(imported)) {
      throw new HardhatError(ERRORS.RESOLVER.INCLUDES_OWN_PACKAGE_NAME, {
        from: from.sourceName,
        imported,
      });
    }

    try {
      let sourceName: string;

      const isRelativeImport = this.#isRelativeImport(imported);

      if (isRelativeImport) {
        sourceName = await this.#relativeImportToSourceName(from, imported);
      } else {
        sourceName = normalizeSourceName(importName); // The sourceName of the imported file is not transformed
      }

      const cached = this.#cache.get(sourceName);
      if (cached !== undefined) {
        return cached;
      }

      let resolvedFile: ResolvedFile;

      // We have this special case here, because otherwise local relative
      // imports can be treated as library imports. For example if
      // `contracts/c.sol` imports `../non-existent/a.sol`
      if (
        from.library === undefined &&
        isRelativeImport &&
        !this.#isRelativeImportToLibrary(from, imported)
      ) {
        resolvedFile = await this.#resolveLocalSourceName(
          sourceName,
          applyRemappings(this.#remappings, sourceName),
        );
      } else {
        resolvedFile = await this.resolveSourceName(sourceName);
      }

      this.#cache.set(sourceName, resolvedFile);
      return resolvedFile;
    } catch (error) {
      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.FILE_NOT_FOUND,
        ) ||
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND,
        )
      ) {
        if (imported !== importName) {
          throw new HardhatError(
            ERRORS.RESOLVER.IMPORTED_MAPPED_FILE_NOT_FOUND,
            {
              imported,
              importName,
              from: from.sourceName,
            },
            error,
          );
        } else {
          throw new HardhatError(
            ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND,
            {
              imported,
              from: from.sourceName,
            },
            error,
          );
        }
      }

      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING,
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING,
          {
            imported,
            from: from.sourceName,
          },
          error,
        );
      }

      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED,
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.IMPORTED_LIBRARY_NOT_INSTALLED,
          {
            library: error.messageArguments.library,
            from: from.sourceName,
          },
          error,
        );
      }

      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.GENERAL.INVALID_READ_OF_DIRECTORY,
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.INVALID_IMPORT_OF_DIRECTORY,
          {
            imported,
            from: from.sourceName,
          },
          error,
        );
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }

  async #resolveLocalSourceName(
    sourceName: string,
    remappedSourceName: string,
  ): Promise<ResolvedFile> {
    await this.#validateSourceNameExistenceAndCasing(
      this.#projectRoot,
      remappedSourceName,
      false,
    );

    const absolutePath = path.join(this.#projectRoot, remappedSourceName);
    return this.#resolveFile(sourceName, absolutePath);
  }

  async #resolveLibrarySourceName(
    sourceName: string,
    remappedSourceName: string,
  ): Promise<ResolvedFile> {
    const normalizedSourceName = remappedSourceName.replace(
      /^node_modules\//,
      "",
    );
    const libraryName = this.#getLibraryName(normalizedSourceName);

    let packageJsonPath;
    try {
      packageJsonPath = this.#resolveNodeModulesFileFromProjectRoot(
        path.join(libraryName, "package.json"),
      );
    } catch (error) {
      // if the project is using a dependency from hardhat itself but it can't
      // be found, this means that a global installation is being used, so we
      // resolve the dependency relative to this file
      if (libraryName === "hardhat") {
        const hardhatCoreDir = path.join(__dirname, "..", "..");
        packageJsonPath = path.join(hardhatCoreDir, "package.json");
      } else {
        throw new HardhatError(
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED,
          {
            library: libraryName,
          },
          error as Error,
        );
      }
    }

    let nodeModulesPath = path.dirname(path.dirname(packageJsonPath));
    if (this.#isScopedPackage(normalizedSourceName)) {
      nodeModulesPath = path.dirname(nodeModulesPath);
    }

    let absolutePath: string;
    if (path.basename(nodeModulesPath) !== NODE_MODULES) {
      // this can happen in monorepos that use PnP, in those
      // cases we handle resolution differently
      const packageRoot = path.dirname(packageJsonPath);
      const pattern = new RegExp(`^${libraryName}/?`);
      const fileName = normalizedSourceName.replace(pattern, "");

      await this.#validateSourceNameExistenceAndCasing(
        packageRoot,
        // TODO: this is _not_ a source name; we should handle this scenario in
        // a better way
        fileName,
        true,
      );
      absolutePath = path.join(packageRoot, fileName);
    } else {
      await this.#validateSourceNameExistenceAndCasing(
        nodeModulesPath,
        normalizedSourceName,
        true,
      );
      absolutePath = path.join(nodeModulesPath, normalizedSourceName);
    }

    const packageInfo: {
      name: string;
      version: string;
    } = JSON.parse((await fs.readFile(packageJsonPath)).toString());
    const libraryVersion = packageInfo.version;

    return this.#resolveFile(
      sourceName,
      // We resolve to the real path here, as we may be resolving a linked library
      await getRealPath(absolutePath),
      libraryName,
      libraryVersion,
    );
  }

  async #relativeImportToSourceName(
    from: ResolvedFile,
    imported: string,
  ): Promise<string> {
    // This is a special case, were we turn relative imports from local files
    // into library imports if necessary. The reason for this is that many
    // users just do `import "../node_modules/lib/a.sol";`.
    if (this.#isRelativeImportToLibrary(from, imported)) {
      return this.#relativeImportToLibraryToSourceName(from, imported);
    }

    const sourceName = normalizeSourceName(
      path.join(path.dirname(from.sourceName), imported),
    );

    // If the file with the import is local, and the normalized version
    // starts with ../ means that it's trying to get outside of the project.
    if (from.library === undefined && sourceName.startsWith("../")) {
      throw new HardhatError(
        ERRORS.RESOLVER.INVALID_IMPORT_OUTSIDE_OF_PROJECT,
        { from: from.sourceName, imported },
      );
    }

    if (
      from.library !== undefined &&
      !this.#isInsideSameDir(from.sourceName, sourceName)
    ) {
      // If the file is being imported from a library, this means that it's
      // trying to reach another one.
      throw new HardhatError(ERRORS.RESOLVER.ILLEGAL_IMPORT, {
        from: from.sourceName,
        imported,
      });
    }

    return sourceName;
  }

  async #resolveFile(
    sourceName: string,
    absolutePath: string,
    libraryName?: string,
    libraryVersion?: string,
  ): Promise<ResolvedFile> {
    const rawContent = await this.#readFile(absolutePath);
    const stats = await fs.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    const contentHash = (
      await createNonCryptographicHashBasedIdentifier(Buffer.from(rawContent))
    ).toString("hex");

    const parsedContent = await this.#parser.parse(
      rawContent,
      absolutePath,
      contentHash,
    );

    const content = {
      rawContent,
      ...parsedContent,
    };

    return new ResolvedFile(
      sourceName,
      absolutePath,
      content,
      contentHash,
      lastModificationDate,
      libraryName,
      libraryVersion,
    );
  }

  #isRelativeImport(imported: string): boolean {
    return imported.startsWith("./") || imported.startsWith("../");
  }

  #resolveNodeModulesFileFromProjectRoot(fileName: string) {
    return resolve.sync(fileName, {
      basedir: this.#projectRoot,
      preserveSymlinks: true,
    });
  }

  #getLibraryName(sourceName: string): string {
    let endIndex: number;
    if (this.#isScopedPackage(sourceName)) {
      endIndex = sourceName.indexOf("/", sourceName.indexOf("/") + 1);
    } else if (sourceName.indexOf("/") === -1) {
      endIndex = sourceName.length;
    } else {
      endIndex = sourceName.indexOf("/");
    }

    return sourceName.slice(0, endIndex);
  }

  #getUriScheme(s: string): string | undefined {
    const re = /([a-zA-Z]+):\/\//;
    const match = re.exec(s);
    if (match === null) {
      return undefined;
    }

    return match[1];
  }

  #isInsideSameDir(sourceNameInDir: string, sourceNameToTest: string) {
    const firstSlash = sourceNameInDir.indexOf("/");
    const dir =
      firstSlash !== -1
        ? sourceNameInDir.substring(0, firstSlash)
        : sourceNameInDir;

    return sourceNameToTest.startsWith(dir);
  }

  #isScopedPackage(packageOrPackageFile: string): boolean {
    return packageOrPackageFile.startsWith("@");
  }

  #isRelativeImportToLibrary(from: ResolvedFile, imported: string): boolean {
    return (
      this.#isRelativeImport(imported) &&
      from.library === undefined &&
      imported.includes(`${NODE_MODULES}/`)
    );
  }

  #relativeImportToLibraryToSourceName(
    from: ResolvedFile,
    imported: string,
  ): string {
    const sourceName = normalizeSourceName(
      path.join(path.dirname(from.sourceName), imported),
    );

    const nmIndex = sourceName.indexOf(`${NODE_MODULES}/`);
    return sourceName.substr(nmIndex + NODE_MODULES.length + 1);
  }

  async #validateSourceNameExistenceAndCasing(
    fromDir: string,
    sourceName: string,
    isLibrary: boolean,
  ) {
    try {
      await validateSourceNameExistenceAndCasing(fromDir, sourceName);
    } catch (error) {
      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.SOURCE_NAMES.FILE_NOT_FOUND,
        )
      ) {
        throw new HardhatError(
          isLibrary
            ? ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
            : ERRORS.RESOLVER.FILE_NOT_FOUND,
          { file: sourceName },
          error,
        );
      }

      if (
        HardhatError.isHardhatErrorType(error, ERRORS.SOURCE_NAMES.WRONG_CASING)
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING,
          {
            incorrect: sourceName,
            correct: error.messageArguments.correct,
          },
          error,
        );
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }
}
