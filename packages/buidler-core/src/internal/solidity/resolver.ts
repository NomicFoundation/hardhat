import fsExtra from "fs-extra";
import path from "path";

import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

import { Parser } from "./parse";
import {
  isAbsolutePathSourceName,
  isLocalSourceName,
  normalizeSourceName,
  replaceBackslashes,
  validateSourceNameExistenceAndCasing,
  validateSourceNameFormat,
} from "./source-names";

export interface ResolvedFilesMap {
  [globalName: string]: ResolvedFile;
}

export interface LibraryInfo {
  name: string;
  version: string;
}

interface FileContent {
  rawContent: string;
  imports: string[];
  versionPragmas: string[];
}

const NODE_MODULES = "node_modules";

export class ResolvedFile {
  public readonly library?: LibraryInfo;

  constructor(
    // TODO-HH: Rename this to sourceName. This is what the solidity team uses.
    public readonly globalName: string,
    public readonly absolutePath: string,
    public readonly content: FileContent,
    // IMPORTANT: Mapped to ctime, NOT mtime. mtime isn't updated when the file
    // properties (e.g. its name) are changed, only when it's content changes.
    public readonly lastModificationDate: Date,
    libraryName?: string,
    libraryVersion?: string
  ) {
    this.globalName = globalName;
    this.absolutePath = absolutePath;
    this.content = content;
    this.lastModificationDate = lastModificationDate;

    if (libraryName !== undefined && libraryVersion !== undefined) {
      this.library = {
        name: libraryName,
        version: libraryVersion,
      };
    }
  }

  public getVersionedName() {
    return (
      this.globalName +
      (this.library !== undefined ? `@v${this.library.version}` : "")
    );
  }
}

export class Resolver {
  constructor(
    private readonly _projectRoot: string,
    private readonly _parser: Parser
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
      throw new BuidlerError(ERRORS.RESOLVER.INVALID_IMPORT_PROTOCOL, {
        from: from.globalName,
        imported,
        protocol: scheme,
      });
    }

    if (replaceBackslashes(imported) !== imported) {
      throw new BuidlerError(ERRORS.RESOLVER.INVALID_IMPORT_BACKSLASH, {
        from: from.globalName,
        imported,
      });
    }

    if (isAbsolutePathSourceName(imported)) {
      throw new BuidlerError(ERRORS.RESOLVER.INVALID_IMPORT_ABSOLUTE_PATH, {
        from: from.globalName,
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
      if (from.library === undefined) {
        return await this._resolveLocalSourceName(sourceName);
      }

      return await this.resolveSourceName(sourceName);
    } catch (error) {
      if (
        BuidlerError.isBuidlerErrorType(
          error,
          ERRORS.RESOLVER.FILE_NOT_FOUND
        ) ||
        BuidlerError.isBuidlerErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND
        )
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND,
          {
            imported,
            from: from.globalName,
          },
          error
        );
      }

      if (
        BuidlerError.isBuidlerErrorType(
          error,
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING
        )
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.INVALID_IMPORT_WRONG_CASING,
          {
            imported,
            from: from.globalName,
          },
          error
        );
      }

      if (
        BuidlerError.isBuidlerErrorType(
          error,
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED
        )
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.IMPORTED_LIBRARY_NOT_INSTALLED,
          {
            library: error.messageArguments.library,
            from: from.globalName,
          },
          error
        );
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }

  private async _resolveLocalSourceName(
    sourceName: string
  ): Promise<ResolvedFile> {
    try {
      await validateSourceNameExistenceAndCasing(this._projectRoot, sourceName);
    } catch (error) {
      if (
        BuidlerError.isBuidlerErrorType(
          error,
          ERRORS.SOURCE_NAMES.FILE_NOT_FOUND
        )
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.FILE_NOT_FOUND,
          { file: sourceName },
          error
        );
      }

      if (
        BuidlerError.isBuidlerErrorType(error, ERRORS.SOURCE_NAMES.WRONG_CASING)
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING,
          {
            incorrect: sourceName,
            correct: error.messageArguments.correct,
          },
          error
        );
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }

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
      // if the project is using a dependency from buidler itself but it can't
      // be found, this means that a global installation is being used, so we
      // resolve the dependency relative to this file
      if (libraryName === "@nomiclabs/buidler") {
        const buidlerCoreDir = path.join(__dirname, "..", "..");
        packageJsonPath = path.join(buidlerCoreDir, "package.json");
      } else {
        throw new BuidlerError(
          ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED,
          {
            library: libraryName,
          },
          error
        );
      }
    }

    let filePath: string;
    try {
      filePath = this._resolveNodeModulesFileFromProjectRoot(sourceName);
    } catch (error) {
      throw new BuidlerError(
        ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND,
        { file: sourceName },
        error
      );
    }

    const packageInfo = await fsExtra.readJson(packageJsonPath);
    const sourceNameWithoutLibraryName = sourceName.substring(
      packageInfo.name.length + 1
    );

    // We can't get the correct casing of the package name from the file system,
    // as linked packages don't necessarily match path and package name, so
    // we validate the package name's casing using the package.json.
    // We assume that this condition can only be true if the casing is wrong.
    if (libraryName !== packageInfo.name) {
      // We throw an error that is not always correct, as it assumes that the
      // rest of the source name has the right casing. If this were wrong, a new
      // error will lead the user to correct it.
      throw new BuidlerError(ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING, {
        incorrect: sourceName,
        correct: `${packageInfo.name}/${sourceNameWithoutLibraryName}`,
      });
    }

    const packagePath = path.dirname(packageJsonPath);

    try {
      // We validate the file casing starting from the package's root and using
      // the source map without library name, so that this also works for linked
      // packages, whose library name and package path don't need to match.
      await validateSourceNameExistenceAndCasing(
        packagePath,
        sourceNameWithoutLibraryName
      );
    } catch (error) {
      if (
        BuidlerError.isBuidlerErrorType(error, ERRORS.SOURCE_NAMES.WRONG_CASING)
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.WRONG_SOURCE_NAME_CASING,
          {
            incorrect: sourceName,
            correct: `${libraryName}/${error.messageArguments.correct}`,
          },
          error
        );
      }

      // We know that the file exists, so we don't handle that here.

      // tslint:disable-next-line only-buidler-error
      throw error;
    }

    return this._resolveFile(
      sourceName,
      filePath,
      libraryName,
      packageInfo.version
    );
  }

  private async _relativeImportToSourceName(
    from: ResolvedFile,
    imported: string
  ): Promise<string> {
    const sourceName = normalizeSourceName(
      path.join(path.dirname(from.globalName), imported)
    );

    // This is a special case, were we turn relative imports from local files
    // into library imports if necessary. The reason for this is that many
    // users just do `import "../node_modules/lib/a.sol";`.
    if (from.library === undefined) {
      const nmIndex = sourceName.indexOf(`${NODE_MODULES}/`);
      if (nmIndex !== -1) {
        return sourceName.substr(nmIndex + NODE_MODULES.length + 1);
      }
    }

    // If the file with the import is local, and the normalized version
    // starts with ../ means that it's trying to get outside of the project.
    if (from.library === undefined && sourceName.startsWith("../")) {
      throw new BuidlerError(
        ERRORS.RESOLVER.INVALID_IMPORT_OUTSIDE_OF_PROJECT,
        { from: from.globalName, imported }
      );
    }

    if (
      from.library !== undefined &&
      !this._isInsideSameDir(from.globalName, sourceName)
    ) {
      // If the file is being imported from a library, this means that it's
      // trying to reach another one.
      throw new BuidlerError(ERRORS.RESOLVER.ILLEGAL_IMPORT, {
        from: from.globalName,
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
    const rawContent = await fsExtra.readFile(absolutePath, {
      encoding: "utf8",
    });
    const stats = await fsExtra.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    const parsedContent = this._parser.parse(rawContent, absolutePath);

    const content = {
      rawContent,
      ...parsedContent,
    };

    return new ResolvedFile(
      sourceName,
      absolutePath,
      content,
      lastModificationDate,
      libraryName,
      libraryVersion
    );
  }

  private _isRelativeImport(imported: string): boolean {
    return imported.startsWith("./") || imported.startsWith("../");
  }

  private _resolveNodeModulesFileFromProjectRoot(fileName: string) {
    return require.resolve(fileName, {
      paths: [this._projectRoot],
    });
  }

  private _getLibraryName(sourceName: string): string {
    const endIndex: number = this._isScopedPackage(sourceName)
      ? sourceName.indexOf("/", sourceName.indexOf("/") + 1)
      : sourceName.indexOf("/");

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
}
