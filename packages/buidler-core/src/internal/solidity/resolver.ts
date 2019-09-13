import fsExtra from "fs-extra";
import path from "path";

import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

export interface ResolvedFilesMap {
  [globalName: string]: ResolvedFile;
}

export interface LibraryInfo {
  name: string;
  version: string;
}

export class ResolvedFile {
  public readonly library?: LibraryInfo;

  constructor(
    public readonly globalName: string,
    public readonly absolutePath: string,
    public readonly content: string,
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
        version: libraryVersion
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
  private readonly _projectRoot: string;

  constructor(projectRoot: string) {
    this._projectRoot = projectRoot;
  }

  public async resolveProjectSourceFile(
    pathToResolve: string
  ): Promise<ResolvedFile> {
    if (!(await fsExtra.pathExists(pathToResolve))) {
      throw new BuidlerError(ERRORS.RESOLVER.FILE_NOT_FOUND, {
        file: pathToResolve
      });
    }

    const absolutePath = await fsExtra.realpath(pathToResolve);

    if (!absolutePath.startsWith(this._projectRoot)) {
      throw new BuidlerError(ERRORS.RESOLVER.FILE_OUTSIDE_PROJECT, {
        file: pathToResolve
      });
    }

    if (absolutePath.includes("node_modules")) {
      throw new BuidlerError(ERRORS.RESOLVER.LIBRARY_FILE_NOT_LOCAL, {
        file: pathToResolve
      });
    }

    const globalName = absolutePath.slice(this._projectRoot.length + 1);

    return this._resolveFile(globalName, absolutePath);
  }

  public async resolveLibrarySourceFile(
    globalName: string
  ): Promise<ResolvedFile> {
    const libraryName = this._getLibraryName(globalName);

    let packagePath;
    try {
      packagePath = this._resolveFromProjectRoot(
        path.join(libraryName, "package.json")
      );
    } catch (error) {
      throw new BuidlerError(
        ERRORS.RESOLVER.LIBRARY_NOT_INSTALLED,
        {
          library: libraryName
        },
        error
      );
    }

    let absolutePath;
    try {
      absolutePath = this._resolveFromProjectRoot(globalName);
    } catch (error) {
      throw new BuidlerError(
        ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND,
        {
          file: globalName
        },
        error
      );
    }

    const libraryPath = path.dirname(packagePath);
    if (!absolutePath.startsWith(libraryPath)) {
      // If it's still from a library with the same name what is happening is
      // that the package.json and the file are being resolved to different
      // installations of the library. This can lead to very confusing
      // situations, so we only use the closes installation
      if (absolutePath.includes(`node_modules/${libraryName}`)) {
        throw new BuidlerError(ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND, {
          file: globalName
        });
      }

      throw new BuidlerError(ERRORS.RESOLVER.FILE_OUTSIDE_LIB, {
        file: globalName,
        library: libraryName
      });
    }

    const packageInfo = await fsExtra.readJson(packagePath);
    const libraryVersion = packageInfo.version;

    return this._resolveFile(
      globalName,
      absolutePath,
      libraryName,
      libraryVersion
    );
  }

  public async resolveImport(
    from: ResolvedFile,
    imported: string
  ): Promise<ResolvedFile> {
    try {
      if (this._isRelativeImport(imported)) {
        if (from.library === undefined) {
          return await this.resolveProjectSourceFile(
            path.normalize(path.join(path.dirname(from.absolutePath), imported))
          );
        }

        const globalName = path.normalize(
          path.join(path.dirname(from.globalName), imported)
        );

        const isIllegal = !globalName.startsWith(from.library.name + path.sep);

        if (isIllegal) {
          throw new BuidlerError(ERRORS.RESOLVER.ILLEGAL_IMPORT, {
            imported,
            from: from.globalName
          });
        }

        imported = globalName;
      }

      return await this.resolveLibrarySourceFile(imported);
    } catch (error) {
      if (
        error.number === ERRORS.RESOLVER.FILE_NOT_FOUND.number ||
        error.number === ERRORS.RESOLVER.LIBRARY_FILE_NOT_FOUND.number
      ) {
        throw new BuidlerError(
          ERRORS.RESOLVER.IMPORTED_FILE_NOT_FOUND,
          {
            imported,
            from: from.globalName
          },
          error
        );
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }

  public async _resolveFile(
    globalName: string,
    absolutePath: string,
    libraryName?: string,
    libraryVersion?: string
  ): Promise<ResolvedFile> {
    const content = await fsExtra.readFile(absolutePath, { encoding: "utf8" });
    const stats = await fsExtra.stat(absolutePath);
    const lastModificationDate = new Date(stats.ctime);

    return new ResolvedFile(
      globalName,
      absolutePath,
      content,
      lastModificationDate,
      libraryName,
      libraryVersion
    );
  }

  public _isRelativeImport(imported: string): boolean {
    return imported.startsWith("./") || imported.startsWith("../");
  }

  public _resolveFromProjectRoot(fileName: string) {
    return require.resolve(fileName, {
      paths: [this._projectRoot]
    });
  }

  public _getLibraryName(globalName: string): string {
    if (globalName.startsWith("@")) {
      return globalName.slice(
        0,
        globalName.indexOf("/", globalName.indexOf("/") + 1)
      );
    }

    return globalName.slice(0, globalName.indexOf("/"));
  }
}
