import fsExtra from "fs-extra";
import path from "path";
import resolve from "resolve";

import {
  FileContent,
  LibraryInfo,
  ResolvedFile as IResolvedFile,
} from "../../types/builtin-tasks";
import {
  isAbsolutePathSourceName,
  isLocalSourceName,
  normalizeSourceName,
  replaceBackslashes,
  validateSourceNameExistenceAndCasing,
  validateSourceNameFormat,
} from "../../utils/source-names";
import { assertHardhatInvariant, HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { createNonCryptographicHashBasedIdentifier } from "../util/hash";

import { Parser } from "./parse";

export interface ResolvedFilesMap {
  [sourceName: string]: ResolvedFile;
}

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
    libraryVersion?: string
  ) {
    assertHardhatInvariant(
      (libraryName === undefined && libraryVersion === undefined) ||
        (libraryName !== undefined && libraryVersion !== undefined),
      "Libraries should have both name and version, or neither one"
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
  constructor(
    private readonly _projectRoot: string,
    private readonly _parser: Parser,
    private readonly _readFile: (absolutePath: string) => Promise<string>
  ) {}

  /**
   * Resolves a source name into a ResolvedFile.
   *
   * @param sourceName The source name as it would be provided to solc.
   */
  public async resolveSourceName(sourceName: string): Promise<ResolvedFile> {
    validateSourceNameFormat(sourceName);

    if (await isLocalSourceName(this._projectRoot, sourceName)) {
      return this._resolveLocalSourceName(sourceName);
    }

    return this._resolveLibrarySourceName(sourceName);
  }

  /**
   * Resolves an import from an already resolved file.
   * @param from The file were the import statement is present.
   * @param imported The path in the import statement.
   */
  public async resolveImport(
    from: ResolvedFile,
    imported: string
  ): Promise<ResolvedFile> {
    const scheme = this._getUriScheme(imported);
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

    try {
      if (!this._isRelativeImport(imported)) {
        return await this.resolveSourceName(normalizeSourceName(imported));
      }

      const sourceName = await this._relativeImportToSourceName(from, imported);

      // We have this special case here, because otherwise local relative
      // imports can be treated as library imports. For example if
      // `contracts/c.sol` imports `../non-existent/a.sol`
      if (
        from.library === undefined &&
        !this._isRelativeImportToLibrary(from, imported)
      ) {
        return await this._resolveLocalSourceName(sourceName);
      }

      return await this.resolveSourceName(sourceName);
    } catch (error) {
      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.FILE_NOT_FOUND
        ) ||
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND,
          {
            imported,
            from: from.sourceName,
          },
          error
        );
      }

      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING,
          {
            imported,
            from: from.sourceName,
          },
          error
        );
      }

      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
        )
      ) {
        throw new HardhatError(
          ERRORS.RESOLVER.IMPORTED_LIBRARY_NOT_INSTALLED,
          {
            library: error.messageArguments.library,
            from: from.sourceName,
          },
          error
        );
      }

      // tslint:disable-next-line only-hardhat-error
      throw error;
    }
  }

  private async _resolveLocalSourceName(
    sourceName: string
  ): Promise<ResolvedFile> {
    await this._validateSourceNameExistenceAndCasing(
      this._projectRoot,
      sourceName,
      false
    );

    const absolutePath = path.join(this._projectRoot, sourceName);
    return this._resolveFile(sourceName, absolutePath);
  }

  private async _resolveLibrarySourceName(
    sourceName: string
  ): Promise<ResolvedFile> {
    const libraryName = this._getLibraryName(sourceName);

    let packageJsonPath;
    try {
      packageJsonPath = this._resolveNodeModulesFileFromProjectRoot(
        path.join(libraryName, "package.json")
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
          error
        );
      }
    }

    let nodeModulesPath = path.dirname(path.dirname(packageJsonPath));
    if (this._isScopedPackage(sourceName)) {
      nodeModulesPath = path.dirname(nodeModulesPath);
    }

    await this._validateSourceNameExistenceAndCasing(
      nodeModulesPath,
      sourceName,
      true
    );

    const packageInfo: {
      name: string;
      version: string;
    } = await fsExtra.readJson(packageJsonPath);
    const libraryVersion = packageInfo.version;

    return this._resolveFile(
      sourceName,
      // We resolve to the real path here, as we may be resolving a linked library
      await fsExtra.realpath(path.join(nodeModulesPath, sourceName)),
      libraryName,
      libraryVersion
    );
  }

  private async _relativeImportToSourceName(
    from: ResolvedFile,
    imported: string
  ): Promise<string> {
    // This is a special case, were we turn relative imports from local files
    // into library imports if necessary. The reason for this is that many
    // users just do `import "../node_modules/lib/a.sol";`.
    if (this._isRelativeImportToLibrary(from, imported)) {
      return this._relativeImportToLibraryToSourceName(from, imported);
    }

    const sourceName = normalizeSourceName(
      path.join(path.dirname(from.sourceName), imported)
    );

    // If the file with the import is local, and the normalized version
    // starts with ../ means that it's trying to get outside of the project.
    if (from.library === undefined && sourceName.startsWith("../")) {
      throw new HardhatError(
        ERRORS.RESOLVER.INVALID_IMPORT_OUTSIDE_OF_PROJECT,
        { from: from.sourceName, imported }
      );
    }

    if (
      from.library !== undefined &&
      !this._isInsideSameDir(from.sourceName, sourceName)
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

  private async _resolveFile(
    sourceName: string,
    absolutePath: string,
    libraryName?: string,
    libraryVersion?: string
  ): Promise<ResolvedFile> {
    const rawContent = await this._readFile(absolutePath);
    const stats = await fsExtra.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    const contentHash = createNonCryptographicHashBasedIdentifier(
      Buffer.from(rawContent)
    ).toString("hex");

    const parsedContent = this._parser.parse(
      rawContent,
      absolutePath,
      contentHash
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
      libraryVersion
    );
  }

  private _isRelativeImport(imported: string): boolean {
    return imported.startsWith("./") || imported.startsWith("../");
  }

  private _resolveNodeModulesFileFromProjectRoot(fileName: string) {
    return resolve.sync(fileName, {
      basedir: this._projectRoot,
      preserveSymlinks: true,
    });
  }

  private _getLibraryName(sourceName: string): string {
    let endIndex: number;
    if (this._isScopedPackage(sourceName)) {
      endIndex = sourceName.indexOf("/", sourceName.indexOf("/") + 1);
    } else if (sourceName.indexOf("/") === -1) {
      endIndex = sourceName.length;
    } else {
      endIndex = sourceName.indexOf("/");
    }

    return sourceName.slice(0, endIndex);
  }

  private _getUriScheme(s: string): string | undefined {
    const re = /([a-zA-Z]+):\/\//;
    const match = re.exec(s);
    if (match === null) {
      return undefined;
    }

    return match[1];
  }

  private _isInsideSameDir(sourceNameInDir: string, sourceNameToTest: string) {
    const firstSlash = sourceNameInDir.indexOf("/");
    const dir =
      firstSlash !== -1
        ? sourceNameInDir.substring(0, firstSlash)
        : sourceNameInDir;

    return sourceNameToTest.startsWith(dir);
  }

  private _isScopedPackage(packageOrPackageFile: string): boolean {
    return packageOrPackageFile.startsWith("@");
  }

  private _isRelativeImportToLibrary(
    from: ResolvedFile,
    imported: string
  ): boolean {
    return (
      this._isRelativeImport(imported) &&
      from.library === undefined &&
      imported.includes(`${NODE_MODULES}/`)
    );
  }

  private _relativeImportToLibraryToSourceName(
    from: ResolvedFile,
    imported: string
  ): string {
    const sourceName = normalizeSourceName(
      path.join(path.dirname(from.sourceName), imported)
    );

    const nmIndex = sourceName.indexOf(`${NODE_MODULES}/`);
    return sourceName.substr(nmIndex + NODE_MODULES.length + 1);
  }

  private async _validateSourceNameExistenceAndCasing(
    fromDir: string,
    sourceName: string,
    isLibrary: boolean
  ) {
    try {
      await validateSourceNameExistenceAndCasing(fromDir, sourceName);
    } catch (error) {
      if (
        HardhatError.isHardhatErrorType(
          error,
          ERRORS.SOURCE_NAMES.FILE_NOT_FOUND
        )
      ) {
        throw new HardhatError(
          isLibrary
            ? ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
            : ERRORS.RESOLVER.FILE_NOT_FOUND,
          { file: sourceName },
          error
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
          error
        );
      }

      // tslint:disable-next-line only-hardhat-error
      throw error;
    }
  }
}
