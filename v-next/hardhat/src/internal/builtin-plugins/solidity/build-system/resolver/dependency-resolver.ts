import type {
  Resolver,
  RemappedNpmPackagesMapJson,
  Remapping,
  ResolvedNpmUserRemapping,
  ResolvedUserRemapping,
  Result,
} from "./types.js";
import type {
  ImportResolutionError,
  NpmRootResolutionError,
  ProjectRootResolutionError,
  ResolvedFileReference,
  UserRemappingReference,
} from "../../../../../types/solidity/errors.js";
import type {
  ResolvedNpmPackage,
  ResolvedFile,
  FileContent,
  ProjectResolvedFile,
  NpmPackageResolvedFile,
} from "../../../../../types/solidity/resolved-file.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";
import { analyze } from "@nomicfoundation/solidity-analyzer";

import {
  ImportResolutionErrorType,
  RootResolutionErrorType,
} from "../../../../../types/solidity/errors.js";
import { ResolvedFileType } from "../../../../../types/solidity/resolved-file.js";
import { AsyncMutex } from "../../../../core/async-mutex.js";

import { parseNpmDirectImport } from "./npm-module-parsing.js";
import {
  isResolvedUserRemapping,
  RemappedNpmPackagesMapImplementation,
} from "./remapped-npm-packages-map.js";
import { applyValidRemapping, formatRemapping } from "./remappings.js";
import {
  fsPathToSourceNamePath,
  sourceNamePathJoin,
  sourceNamePathToFsPath,
} from "./source-name-utils.js";
import { UserRemappingType } from "./types.js";
import {
  PathValidationErrorType,
  resolveSubpathWithPackageExports,
  validateFsPath,
} from "./utils.js";

const NPM_PACKAGES_WITH_SIMULATED_PACKAGE_EXPORTS = new Set(["forge-std"]);

export class ResolverImplementation implements Resolver {
  readonly #projectRoot: string;
  readonly #npmPackageMap: RemappedNpmPackagesMapImplementation;
  readonly #hhProjectPackage: ResolvedNpmPackage;
  readonly #readUtf8File: (absPath: string) => Promise<string>;

  /**
   * IMPORTANT: This mutex must be acquired before writing to any of the mutable
   * fields of this class.
   *
   * We do this by using the mutex in the public methods, which don't call each
   * other.
   */
  readonly #mutex = new AsyncMutex();

  /**
   * We use this map to ensure that we only resolve each file once.
   **/
  readonly #resolvedFileByInputSourceName: Map<string, ResolvedFile> =
    new Map();

  /**
   * A fake `<root>.sol` file that we use to resolve npm roots using
   * the same logic we use for imports.
   */
  readonly #fakeRootFile: ProjectResolvedFile;

  /**
   * Creates a new resolver.
   *
   * @param projectRoot The absolute path to the Hardhat project root.
   * @param readUtf8File A function that reads a UTF-8 file.
   * @returns The resolver or the user remapping errors found.
   */
  public static async create(
    projectRoot: string,
    readUtf8File: (absPath: string) => Promise<string>,
  ): Promise<Resolver> {
    const map = await RemappedNpmPackagesMapImplementation.create(projectRoot);

    return new ResolverImplementation(projectRoot, map, readUtf8File);
  }

  private constructor(
    projectRoot: string,
    npmPackagesMap: RemappedNpmPackagesMapImplementation,
    readUtf8File: (absPath: string) => Promise<string>,
  ) {
    this.#projectRoot = projectRoot;
    this.#npmPackageMap = npmPackagesMap;
    this.#hhProjectPackage = npmPackagesMap.getHardhatProjectPackage();
    this.#readUtf8File = readUtf8File;

    const fakeRootFileName = "<fake-root-do-not-use>.sol";
    this.#fakeRootFile = {
      type: ResolvedFileType.PROJECT_FILE,
      inputSourceName: sourceNamePathJoin(
        this.#hhProjectPackage.rootSourceName,
        fakeRootFileName,
      ),
      fsPath: path.join(this.#projectRoot, fakeRootFileName),
      content: {
        importPaths: [],
        text: "",
        versionPragmas: [],
      },
      package: this.#hhProjectPackage,
    };
  }

  public async resolveProjectFile(
    absoluteFilePath: string,
  ): Promise<Result<ProjectResolvedFile, ProjectRootResolutionError>> {
    return this.#mutex.exclusiveRun(async () => {
      return this.#resolveProjectFile(absoluteFilePath);
    });
  }

  public async resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<
    Result<
      { file: NpmPackageResolvedFile; remapping?: ResolvedNpmUserRemapping },
      NpmRootResolutionError
    >
  > {
    return this.#mutex.exclusiveRun(async () => {
      return this.#resolveNpmDependencyFileAsRoot(npmModule);
    });
  }

  public async resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<
      { file: ResolvedFile; remapping?: Remapping | ResolvedUserRemapping },
      ImportResolutionError
    >
  > {
    return this.#mutex.exclusiveRun(async () =>
      this.#resolveImport(from, importPath),
    );
  }

  async #resolveProjectFile(
    absoluteFilePath: string,
  ): Promise<Result<ProjectResolvedFile, ProjectRootResolutionError>> {
    if (!absoluteFilePath.startsWith(this.#projectRoot)) {
      return {
        success: false,
        error: {
          type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT,
          absoluteFilePath,
        },
      };
    }

    const relativeFilePath = path.relative(this.#projectRoot, absoluteFilePath);

    // We first check if the file has already been resolved.
    //
    // Note that it may have received the right path, but with the wrong
    // casing. We don't care at this point, as it would just mean a cache
    // miss, and we proceed to get the right casing in that case.
    //
    // However, as most of the time these absolute paths are read from the file
    // system, they'd have the right casing in general.
    //
    // If we need to fetch the right casing, we'd have to recheck the cache,
    // to avoid re-resolving the file.
    let inputSourceName = sourceNamePathJoin(
      this.#hhProjectPackage.rootSourceName,
      fsPathToSourceNamePath(relativeFilePath),
    );

    const existing = this.#resolvedFileByInputSourceName.get(inputSourceName);

    if (existing !== undefined) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
        The cache is type-unsafe, but we are sure this is a ProjectResolvedFile
        because of how its input source name is created */
      const existingProjectResolvedFile = existing as ProjectResolvedFile;

      return {
        success: true,
        value: existingProjectResolvedFile,
      };
    }

    if (relativeFilePath.startsWith("node_modules" + path.sep)) {
      return {
        success: false,
        error: {
          type: RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES,
          absoluteFilePath,
        },
      };
    }

    const pathValidation = await validateFsPath(
      this.#projectRoot,
      relativeFilePath,
    );

    let realCasingRelativePath = relativeFilePath;
    if (pathValidation.success === false) {
      if (pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST) {
        return {
          success: false,
          error: {
            type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST,
            absoluteFilePath,
          },
        };
      }

      // Now that we have the correct casing, we "fix" the input source name.
      realCasingRelativePath = pathValidation.error.correctCasing;
      inputSourceName = sourceNamePathJoin(
        this.#hhProjectPackage.rootSourceName,
        fsPathToSourceNamePath(realCasingRelativePath),
      );
    }

    // Maybe it was already resolved, so we need to check with the right
    // casing
    const resolvedWithTheRightCasing =
      this.#resolvedFileByInputSourceName.get(inputSourceName);
    if (resolvedWithTheRightCasing !== undefined) {
      const resolvedWithTheRightCasingProjectResolvedFile =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Same as above, we know it's a project file because of its input
          source name */
        resolvedWithTheRightCasing as ProjectResolvedFile;

      return {
        success: true,
        value: resolvedWithTheRightCasingProjectResolvedFile,
      };
    }

    const fsPathWithTheRightCasing = path.join(
      this.#projectRoot,
      realCasingRelativePath,
    );

    const resolvedFile = await this.#buildResolvedFile({
      npmPackage: this.#hhProjectPackage,
      fsPath: fsPathWithTheRightCasing,
      inputSourceName,
    });

    this.#resolvedFileByInputSourceName.set(inputSourceName, resolvedFile);

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
      We know it's a project file, because we created it. */
    const resolvedFileAsProjectFile = resolvedFile as ProjectResolvedFile;

    return {
      success: true,
      value: resolvedFileAsProjectFile,
    };
  }

  public toJSON(): {
    resolvedFileBySourceName: Record<string, ResolvedFile>;
    remappedNpmPackagesMap: RemappedNpmPackagesMapJson;
  } {
    return {
      resolvedFileBySourceName: Object.fromEntries(
        this.#resolvedFileByInputSourceName.entries(),
      ),
      remappedNpmPackagesMap: this.#npmPackageMap.toJSON(),
    };
  }

  async #resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<
    Result<
      { file: NpmPackageResolvedFile; remapping?: ResolvedNpmUserRemapping },
      NpmRootResolutionError
    >
  > {
    // We want to be sure that the resolution of npm root files is treated
    // exactly like imports, so we use a fake root file and resolve the
    // npmModule as if it were a directImport inside of it.
    //
    // NOTE: As we use a public method here, we don't acquire the mutex,
    // but we don't modify the state in this method itself.
    const parsedNpmModule = parseNpmDirectImport(npmModule);

    if (parsedNpmModule === undefined) {
      return {
        success: false,
        error: {
          type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT,
          npmModule,
        },
      };
    }

    const result = await this.#resolveImport(this.#fakeRootFile, npmModule);

    if (result.success === false) {
      return {
        success: false,
        error: this.#importResolutionErrorToNpmRootResolutionError(
          npmModule,
          result.error,
        ),
      };
    }

    const resolvedFile = result.value.file;

    assertHardhatInvariant(
      result.value.remapping !== undefined,
      "We must have a remapping here, becase we either resolved though a user remapping, or npm",
    );

    // If resolving this fake import results in using a user remapping, we
    // need to return it.
    //
    // If instead, if using a generated remapping for that import, we don't
    // return it, as this is not a real import.
    const remapping = isResolvedUserRemapping(result.value.remapping)
      ? result.value.remapping
      : undefined;

    // This could happen due to a user remapping
    if (resolvedFile.type !== ResolvedFileType.NPM_PACKAGE_FILE) {
      assertHardhatInvariant(
        remapping !== undefined,
        "Expected user remapping to be present if the import resolved to a local file",
      );

      return {
        success: false,
        error: {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule,
          userRemapping: {
            originalUserRemapping: remapping.originalFormat,
            actualUserRemapping: formatRemapping(remapping),
            remappingSource: remapping.source,
          },
          resolvedFileFsPath: resolvedFile.fsPath,
        },
      };
    }

    // By this point, we know if that we have a user remapping, it's into an
    // npm package, because otherwise we would have returned an error.
    // We need to do this invariant assertion here, because otherwise TS will
    // complain.
    let remappingReuslt: ResolvedNpmUserRemapping | undefined;
    if (remapping !== undefined) {
      assertHardhatInvariant(
        remapping.type === UserRemappingType.NPM,
        "If we have a user remapping, it must be a npm remapping",
      );

      remappingReuslt = remapping;
    }

    return {
      success: true,
      value: {
        file: resolvedFile,
        remapping: remappingReuslt,
      },
    };
  }

  async #resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<
      {
        file: ResolvedFile;
        remapping?: Remapping | ResolvedUserRemapping;
      },
      ImportResolutionError
    >
  > {
    // Imports shouldn't include windows separators
    if (importPath.includes("\\")) {
      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS,
          fromFsPath: from.fsPath,
          importPath,
        },
      };
    }

    const isRelativeImport =
      importPath.startsWith("./") || importPath.startsWith("../");

    const directImport = isRelativeImport
      ? sourceNamePathJoin(path.dirname(from.inputSourceName), importPath)
      : importPath;

    if (isRelativeImport) {
      // If the import is relative, it shouldn't leave its package
      if (!directImport.startsWith(from.package.rootSourceName)) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT,
            fromFsPath: from.fsPath,
            importPath,
          },
        };
      }

      // It also shouldn't get into its package's node_modules
      if (
        directImport.startsWith(
          sourceNamePathJoin(from.package.rootSourceName, "node_modules"),
        )
      ) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES,
            fromFsPath: from.fsPath,
            importPath,
          },
        };
      }
    }

    // Now, we get the best user remapping, if there's any.
    const bestUserRemappingResult =
      await this.#npmPackageMap.selectBestUserRemapping(from, directImport);

    if (bestUserRemappingResult.success === false) {
      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS,
          fromFsPath: from.fsPath,
          importPath,
          remappingErrors: bestUserRemappingResult.error,
        },
      };
    }

    const bestUserRemapping = bestUserRemappingResult.value;

    if (isRelativeImport) {
      // Relative imports should be resolved based on the file system, so
      // they should not be affected by user remapping.
      if (bestUserRemapping !== undefined) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING,
            fromFsPath: from.fsPath,
            importPath,
            directImport,
            userRemapping: this.#buildUserRemappingReference({
              userRemapping: bestUserRemapping,
            }),
          },
        };
      }

      return this.#resolveRelativeImport({
        from,
        importPath,
        directImport,
      });
    } else {
      if (bestUserRemapping !== undefined) {
        // If the import isn't relative, and there's a user remapping, we
        // prioritize that.
        return this.#resolveUserRemappedImport({
          from,
          importPath,
          directImport,
          remapping: bestUserRemapping,
        });
      }

      // Otherwise it should be resolved through npm
      const npmResolutionResult = await this.#resolveImportThroughNpm({
        from,
        importPath,
        directImport,
      });

      if (npmResolutionResult.success === true) {
        return { success: true, value: npmResolutionResult.value };
      }

      // If the npm resolution fails because the package was not installed, or
      // because the import was invalid, we try to detect if the user was
      // trying to use a direct import (i.e. not relative) to import a local
      // file.
      //
      // We do this to improve the error message that we generate, and suggest
      // a user remapping if they insist on using direct imports.
      if (
        npmResolutionResult.error.type ===
          ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE ||
        npmResolutionResult.error.type ===
          ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX
      ) {
        const improvedError = await this.#tryToGenerateDirectLocalImportError({
          from,
          importPath,
        });

        if (improvedError !== undefined) {
          return {
            success: false,
            error: improvedError,
          };
        }
      }

      return npmResolutionResult;
    }
  }

  async #resolveRelativeImport({
    from,
    importPath,
    directImport,
  }: {
    from: ResolvedFile;
    importPath: string;
    directImport: string;
  }): Promise<Result<{ file: ResolvedFile }, ImportResolutionError>> {
    const inputSourceName = directImport;

    const existing = this.#resolvedFileByInputSourceName.get(inputSourceName);
    if (existing !== undefined) {
      return { success: true, value: { file: existing } };
    }

    const relativeSourceNamePath = this.#getRelativeSourceNamePath({
      npmPackage: from.package,
      fileInputSourceName: inputSourceName,
    });

    const relativeFsPath = sourceNamePathToFsPath(relativeSourceNamePath);

    return this.#commonImportResolution({
      from,
      importPath,
      npmPackage: from.package,
      inputSourceName,
      relativeFsPathWithinPackage: relativeFsPath,
      subpath: relativeSourceNamePath,
    });
  }

  /**
   * Resolves a user remapped import.
   * @returns The resolved file, or an error. If successful, the remapping is
   * always present, and of type `ResolvedUserRemapping`.
   */
  async #resolveUserRemappedImport({
    from,
    importPath,
    directImport,
    remapping,
  }: {
    from: ResolvedFile;
    importPath: string;
    directImport: string;
    remapping: ResolvedUserRemapping;
  }): Promise<
    Result<
      { file: ResolvedFile; remapping?: Remapping | ResolvedUserRemapping },
      ImportResolutionError
    >
  > {
    const remappedDirectImport = applyValidRemapping(directImport, remapping);

    const inputSourceName = remappedDirectImport;
    const existing =
      this.#resolvedFileByInputSourceName.get(remappedDirectImport);
    if (existing !== undefined) {
      return { success: true, value: { file: existing, remapping } };
    }

    const fromNpmPackage =
      from.type === ResolvedFileType.NPM_PACKAGE_FILE
        ? from.package
        : this.#hhProjectPackage;

    // We get the npm package that's the target of the remapping. If none
    // is present, that's because it's remapping to a local file, so it's
    // the fromNpmPackage.
    const targetNpmPackage =
      remapping.type === UserRemappingType.NPM
        ? remapping.targetNpmPackage.package
        : fromNpmPackage;

    // A user remapping is created based on the fs path in the package, so
    // we can get the relative path based on the input source name root of the
    // target package.
    const relativeSourceNamePath = this.#getRelativeSourceNamePath({
      npmPackage: targetNpmPackage,
      fileInputSourceName: inputSourceName,
    });

    const relativeFsPath = sourceNamePathToFsPath(relativeSourceNamePath);

    return this.#commonImportResolution({
      from,
      importPath,
      npmPackage: targetNpmPackage,
      inputSourceName,
      relativeFsPathWithinPackage: relativeFsPath,
      subpath: relativeSourceNamePath,
      userRemapping: remapping,
    });
  }

  /**
   * Resolves an import through npm.
   * @returns The resolved file, or an error. If successful, the remapping is
   * always present.
   */
  async #resolveImportThroughNpm({
    from,
    importPath,
    directImport,
  }: {
    from: ResolvedFile;
    importPath: string;
    directImport: string;
  }): Promise<
    Result<
      { file: ResolvedFile; remapping?: Remapping | ResolvedUserRemapping },
      ImportResolutionError
    >
  > {
    const parsedDirectImport = parseNpmDirectImport(directImport);

    if (parsedDirectImport === undefined) {
      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX,
          fromFsPath: from.fsPath,
          importPath,
        },
      };
    }

    const fromNpmPackage =
      from.type === ResolvedFileType.NPM_PACKAGE_FILE
        ? from.package
        : this.#hhProjectPackage;

    const installationName = parsedDirectImport.package;

    const dependencyResolution =
      await this.#npmPackageMap.resolveDependencyByInstallationName(
        fromNpmPackage,
        installationName,
      );

    if (dependencyResolution === undefined) {
      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE,
          fromFsPath: from.fsPath,
          importPath,
          installationName: parsedDirectImport.package,
        },
      };
    }

    const dependency = dependencyResolution.package;

    const subpath = parsedDirectImport.subpath;

    let resolvedSubpath: string | undefined;
    if (
      dependency.exports !== undefined ||
      NPM_PACKAGES_WITH_SIMULATED_PACKAGE_EXPORTS.has(dependency.name)
    ) {
      const dependencyWithPackageExports = {
        ...dependency,
        exports: dependency.exports ?? {
          "./*.sol": "./src/*.sol",
        },
      };

      const pathResolutionResult = resolveSubpathWithPackageExports(
        dependencyWithPackageExports,
        subpath,
      );

      if (pathResolutionResult.success === false) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
            fromFsPath: from.fsPath,
            importPath,
            ...this.#buildResolvedFileReference({
              npmPackage: dependency,
              subpath,
            }),
          },
        };
      }

      resolvedSubpath = pathResolutionResult.value;
    }

    const inputSourceName = sourceNamePathJoin(
      dependency.rootSourceName,
      resolvedSubpath ?? subpath,
    );

    // There are two types of remappings that we may use for npm imports.
    //
    // One is a generic remapping from fromNpmPackage to dependency using
    // installationName.
    //
    // The other one, while more verbose, is a remapping specifically from
    // forNpmPackage into inputSourceName, using directImport.
    //
    // We use the second one when applying package.exports, and it changes the
    // subpath of the file.
    const remapping =
      resolvedSubpath !== undefined && resolvedSubpath !== subpath
        ? await this.#npmPackageMap.generateRemappingIntoNpmFile(
            fromNpmPackage,
            directImport,
            inputSourceName,
          )
        : dependencyResolution.generatedRemapping;

    const existing = this.#resolvedFileByInputSourceName.get(inputSourceName);
    if (existing !== undefined) {
      return {
        success: true,
        value: {
          file: existing,
          remapping,
        },
      };
    }

    const relativePath = resolvedSubpath ?? subpath;
    const relativeFsPathWithinPackage = sourceNamePathToFsPath(relativePath);

    return this.#commonImportResolution({
      from,
      importPath,
      npmPackage: dependency,
      inputSourceName,
      relativeFsPathWithinPackage,
      subpath,
      generatedRemapping: remapping,
      packageExportsResolvedSubpath: resolvedSubpath,
    });
  }

  /**
   * Once the other methods selected which file to import, the rest of the logic
   * is shared in this method.
   */
  async #commonImportResolution({
    from,
    importPath,
    npmPackage,
    inputSourceName,
    relativeFsPathWithinPackage,
    subpath,
    userRemapping,
    generatedRemapping,
    packageExportsResolvedSubpath,
  }: {
    from: ResolvedFile;
    importPath: string;
    npmPackage: ResolvedNpmPackage;
    inputSourceName: string;
    relativeFsPathWithinPackage: string;
    subpath: string;
    userRemapping?: ResolvedUserRemapping;
    generatedRemapping?: Remapping;
    packageExportsResolvedSubpath?: string;
  }): Promise<
    Result<
      { file: ResolvedFile; remapping?: Remapping | ResolvedUserRemapping },
      ImportResolutionError
    >
  > {
    const pathValidation = await validateFsPath(
      npmPackage.rootFsPath,
      relativeFsPathWithinPackage,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            ...this.#buildResolvedFileReference({
              npmPackage,
              subpath,
              userRemapping,
              packageExportsResolvedSubpath,
            }),
          },
        };
      }

      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: from.fsPath,
          importPath,
          ...this.#buildResolvedFileReference({
            npmPackage,
            subpath,
            userRemapping,
            packageExportsResolvedSubpath,
          }),
          correctCasing: fsPathToSourceNamePath(
            pathValidation.error.correctCasing,
          ),
        },
      };
    }

    const fsPath = path.join(
      npmPackage.rootFsPath,
      relativeFsPathWithinPackage,
    );

    const resolvedFile = await this.#buildResolvedFile({
      npmPackage,
      fsPath,
      inputSourceName,
    });

    this.#resolvedFileByInputSourceName.set(inputSourceName, resolvedFile);

    return {
      success: true,
      value: {
        file: resolvedFile,
        // We only call this function with one of the two, but userRemappings
        // have priority in general, so writing it this way is safer.
        remapping: userRemapping ?? generatedRemapping,
      },
    };
  }

  async #tryToGenerateDirectLocalImportError({
    from,
    importPath,
  }: {
    from: ResolvedFile;
    importPath: string;
  }): Promise<ImportResolutionError | undefined> {
    let baseDir = path.dirname(from.fsPath);
    const firstDir = importPath.substring(0, importPath.indexOf("/"));
    // If there's no directory separator, or the import is just a directory
    // we don't suggest a remapping
    if (firstDir === "" || firstDir.length === importPath.length - 1) {
      return undefined;
    }

    while (baseDir.startsWith(from.package.rootFsPath)) {
      const firstDirPath = path.join(baseDir, firstDir);

      if (await exists(firstDirPath)) {
        const baseDirSourceName = fsPathToSourceNamePath(
          path.relative(from.package.rootFsPath, baseDir),
        );

        const context =
          from.package === this.#hhProjectPackage
            ? baseDirSourceName !== ""
              ? baseDirSourceName + "/"
              : ""
            : sourceNamePathJoin(
                from.package.rootSourceName,
                baseDirSourceName + "/",
              );

        const prefix = firstDir + "/";

        const target =
          from.package === this.#hhProjectPackage
            ? prefix
            : sourceNamePathJoin(from.package.rootSourceName, prefix);

        return {
          type: ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE,
          fromFsPath: from.fsPath,
          importPath,
          suggestedRemapping: formatRemapping({
            context,
            prefix,
            target,
          }),
        };
      }

      baseDir = path.dirname(baseDir);
    }

    return undefined;
  }

  async #buildResolvedFile({
    inputSourceName,
    fsPath,
    npmPackage,
  }: {
    inputSourceName: string;
    fsPath: string;
    npmPackage: ResolvedNpmPackage;
  }): Promise<ResolvedFile> {
    const content = await this.#readFileContent({ absolutePath: fsPath });

    return {
      type:
        npmPackage === this.#hhProjectPackage
          ? ResolvedFileType.PROJECT_FILE
          : ResolvedFileType.NPM_PACKAGE_FILE,
      inputSourceName,
      fsPath,
      content,
      package: npmPackage,
    };
  }

  #buildResolvedFileReference({
    npmPackage: targetNpmPackage,
    subpath,
    userRemapping,
    packageExportsResolvedSubpath,
  }: {
    npmPackage: ResolvedNpmPackage;
    subpath: string;
    userRemapping?: ResolvedUserRemapping;
    packageExportsResolvedSubpath?: string;
  }): ResolvedFileReference {
    return {
      resolvedFileType:
        targetNpmPackage === this.#hhProjectPackage
          ? ResolvedFileType.PROJECT_FILE
          : ResolvedFileType.NPM_PACKAGE_FILE,
      npmPackage: {
        name: targetNpmPackage.name,
        version: targetNpmPackage.version,
        rootFsPath: targetNpmPackage.rootFsPath,
      },
      userRemapping:
        userRemapping === undefined
          ? undefined
          : this.#buildUserRemappingReference({ userRemapping }),
      subpath,
      packageExportsResolvedSubpath,
    };
  }

  #buildUserRemappingReference({
    userRemapping,
  }: {
    userRemapping: ResolvedUserRemapping;
  }): UserRemappingReference {
    return {
      originalUserRemapping: userRemapping.originalFormat,
      actualUserRemapping: formatRemapping(userRemapping),
      remappingSource: userRemapping.source,
    };
  }

  /**
   * Returns the relative input source name from the npmPackage's input source name root.
   * @param nmpPackage The package
   * @param fileInputSourceName The file's input source name.
   */
  #getRelativeSourceNamePath({
    npmPackage: nmpPackage,
    fileInputSourceName,
  }: {
    npmPackage: ResolvedNpmPackage;
    fileInputSourceName: string;
  }) {
    return fileInputSourceName.substring(nmpPackage.rootSourceName.length + 1);
  }

  #importResolutionErrorToNpmRootResolutionError(
    npmModule: string,
    error: ImportResolutionError,
  ): NpmRootResolutionError {
    switch (error.type) {
      /* c8 ignore start */
      case ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT: {
        assertHardhatInvariant(
          false,
          "This could not happen, as we validated that the module name is a valid npm module",
        );
      }
      case ImportResolutionErrorType.RELATIVE_IMPORT_CLASHES_WITH_USER_REMAPPING: {
        assertHardhatInvariant(
          false,
          "This should never happen: An npm root file must not be a relative import",
        );
      }
      /* c8 ignore end */
      case ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX:
      case ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS:
      case ImportResolutionErrorType.RELATIVE_IMPORT_INTO_NODE_MODULES: {
        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT,
          npmModule,
        };
      }
      case ImportResolutionErrorType.IMPORT_DOESNT_EXIST: {
        assertHardhatInvariant(
          error.npmPackage !== undefined,
          "We should have a npm package if the import doesn't exist, as we know are doing an npm import",
        );

        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
          npmModule,
          userRemapping: error.userRemapping,
          npmPackage: error.npmPackage,
          resolvedFileType: error.resolvedFileType,
          subpath: error.subpath,
          packageExportsResolvedSubpath: error.packageExportsResolvedSubpath,
        };
      }
      case ImportResolutionErrorType.IMPORT_INVALID_CASING: {
        assertHardhatInvariant(
          error.npmPackage !== undefined,
          "We should have a npm package if the import doesn't exist, as we know are doing an npm import",
        );

        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
          npmModule,
          correctCasing: error.correctCasing,
          userRemapping: error.userRemapping,
          npmPackage: error.npmPackage,
          resolvedFileType: error.resolvedFileType,
          subpath: error.subpath,
          packageExportsResolvedSubpath: error.packageExportsResolvedSubpath,
        };
      }
      case ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE: {
        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
          npmModule,
          installationName: error.installationName,
        };
      }
      case ImportResolutionErrorType.IMPORT_WITH_REMAPPING_ERRORS: {
        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLUTION_WITH_REMAPPING_ERRORS,
          npmModule,
          remappingErrors: error.remappingErrors,
        };
      }
      case ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE: {
        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE,
          npmModule,
          userRemapping: error.userRemapping,
          npmPackage: error.npmPackage,
          resolvedFileType: error.resolvedFileType,
          subpath: error.subpath,
          packageExportsResolvedSubpath: error.packageExportsResolvedSubpath,
        };
      }
      case ImportResolutionErrorType.DIRECT_IMPORT_TO_LOCAL_FILE: {
        return {
          type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
          npmModule,
          userRemapping: undefined,
          resolvedFileFsPath: path.join(
            this.#hhProjectPackage.rootFsPath,
            npmModule,
          ),
        };
      }
    }
  }

  /**
   * Reads and analyzes the file at the given absolute path.
   */
  async #readFileContent({
    absolutePath,
  }: {
    absolutePath: string;
  }): Promise<FileContent> {
    const text = await this.#readUtf8File(absolutePath);
    const { imports, versionPragmas } = analyze(text);

    return {
      text,
      importPaths: imports,
      versionPragmas,
    };
  }
}
