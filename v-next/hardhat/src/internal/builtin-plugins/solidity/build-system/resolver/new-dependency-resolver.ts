import type { ResolvedUserRemapping } from "./remapped-npm-packages-map.js";
import type { Remapping, Resolver } from "./types.js";
import type {
  ImportResolutionError,
  NpmRootResolutionError,
  ProjectRootResolutionError,
  ResolvedFileReference,
  RootResolutionError,
  UserRemappingError,
  UserRemappingReference,
} from "../../../../../types/solidity/errors.js";
import type {
  ResolvedNpmPackage,
  ResolvedFile,
  FileContent,
  ProjectResolvedFile,
  NpmPackageResolvedFile,
} from "../../../../../types/solidity/resolved-file.js";
import type { Result } from "../../../../../types/utils.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  exists,
  FileNotFoundError,
  getFileTrueCase,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { analyze } from "@nomicfoundation/solidity-analyzer";
import * as resolve from "resolve.exports";

import {
  ImportResolutionErrorType,
  RootResolutionErrorType,
} from "../../../../../types/solidity/errors.js";
import { ResolvedFileType } from "../../../../../types/solidity/resolved-file.js";
import { AsyncMutex } from "../../../../core/async-mutex.js";
import {
  NpmPackageResolvedFileImplementation,
  ProjectResolvedFileImplementation,
} from "../resolved-file.js";

import { parseNpmDirectImport } from "./npm-moudles-parsing.js";
import {
  isResolvedUserRemapping,
  RemappedNpmPackagesMap,
} from "./remapped-npm-packages-map.js";
import {
  applyValidRemapping,
  formatRemapping,
  selectBestRemapping,
} from "./remappings.js";
import {
  fsPathToSourceNamePath,
  sourceNamePathJoin,
  sourceNamePathToFsPath,
} from "./source-name-utils.js";

export interface NewResolver {
  resolveProjectFile(
    absoluteFilePath: string,
  ): Promise<Result<ProjectResolvedFile, ProjectRootResolutionError>>;

  resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<
    Result<
      { file: NpmPackageResolvedFile; remapping?: Remapping },
      NpmRootResolutionError
    >
  >;

  resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  >;
}

export class NewResolverImplementation implements NewResolver {
  readonly #projectRoot: string;
  readonly #npmPackageMap: RemappedNpmPackagesMap;

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
  readonly #resolvedFileBySourceName: Map<string, ResolvedFile> = new Map();

  /**
   * A fake file `<root>.sol` that we use to resolve npm roots using
   * the same logic we use for imports.
   */
  readonly #fakeRootFile: ProjectResolvedFile;

  /**
   * Creates a new resolver.
   *
   * The resolver will read and process all the remappings.txt files in the
   * project, and any npm package referenced by those (recursively).
   *
   * @param projectRoot The absolute path to the Hardhat project root.
   * @returns The resolver or the user remapping errors found.
   */
  public static async create(
    projectRoot: string,
  ): Promise<Result<NewResolver, UserRemappingError[]>> {
    const result = await RemappedNpmPackagesMap.create(projectRoot);

    if (result.success === false) {
      return result;
    }

    return {
      success: true,
      value: new NewResolverImplementation(projectRoot, result.value),
    };
  }

  private constructor(
    projectRoot: string,
    npmPackagesMap: RemappedNpmPackagesMap,
  ) {
    this.#projectRoot = projectRoot;
    this.#npmPackageMap = npmPackagesMap;
    this.#fakeRootFile = new ProjectResolvedFileImplementation({
      sourceName: sourceNamePathJoin(
        npmPackagesMap.hardhatProjectPackage.rootSourceName,
        "<root>.sol",
      ),
      fsPath: path.join(this.#projectRoot, "<root>.sol"),
      content: {
        importPaths: [],
        text: "",
        versionPragmas: [],
      },
      package: npmPackagesMap.hardhatProjectPackage,
    });
  }

  public async resolveProjectFile(
    absoluteFilePath: string,
  ): Promise<Result<ProjectResolvedFile, ProjectRootResolutionError>> {
    return this.#mutex.exclusiveRun(async () => {
      if (!absoluteFilePath.startsWith(this.#projectRoot)) {
        return {
          success: false,
          error: {
            type: RootResolutionErrorType.PROJECT_ROOT_FILE_NOT_IN_PROJECT,
            absoluteFilePath,
          },
        };
      }

      const relativeFilePath = path.relative(
        this.#projectRoot,
        absoluteFilePath,
      );

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
      let sourceName = sourceNamePathJoin(
        this.#npmPackageMap.hardhatProjectPackage.rootSourceName,
        fsPathToSourceNamePath(relativeFilePath),
      );

      const existing = this.#resolvedFileBySourceName.get(sourceName);

      if (existing !== undefined) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
        The cache is type-unsafe, but we are sure this is a ProjectResolvedFile
        because of how its source name is created */
        const existingProjectResolvedFile = existing as ProjectResolvedFile;

        return {
          success: true,
          value: existingProjectResolvedFile,
        };
      }

      const pathValidation = await validateFsPath(
        this.#projectRoot,
        relativeFilePath,
      );

      let realCaseingRelativePath = relativeFilePath;
      if (pathValidation.success === false) {
        if (
          pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST
        ) {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.PROJECT_ROOT_FILE_DOESNT_EXIST,
              absoluteFilePath,
            },
          };
        }

        // Now that we have the correct casing, we "fix" the source name.
        realCaseingRelativePath = pathValidation.error.correctCasing;
        sourceName = sourceNamePathJoin(
          this.#npmPackageMap.hardhatProjectPackage.rootSourceName,
          fsPathToSourceNamePath(realCaseingRelativePath),
        );
      }

      if (
        sourceName.startsWith(
          sourceNamePathJoin(
            this.#npmPackageMap.hardhatProjectPackage.rootSourceName,
            "node_modules/",
          ),
        )
      ) {
        return {
          success: false,
          error: {
            type: RootResolutionErrorType.PROJECT_ROOT_FILE_IN_NODE_MODULES,
            absoluteFilePath,
          },
        };
      }

      // Maybe it was already resolved, so we need to check with the right
      // casing
      const resolvedWithTheRightCasing =
        this.#resolvedFileBySourceName.get(sourceName);
      if (resolvedWithTheRightCasing !== undefined) {
        const resolvedWithTheRightCasingProjectResolvedFile =
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Same as above, we know it's a project file because of its source
          name */
          resolvedWithTheRightCasing as ProjectResolvedFile;

        return {
          success: true,
          value: resolvedWithTheRightCasingProjectResolvedFile,
        };
      }

      const fsPathWithTheRightCasing = path.join(
        this.#projectRoot,
        realCaseingRelativePath,
      );

      const resolvedFile: ProjectResolvedFile =
        new ProjectResolvedFileImplementation({
          sourceName,
          fsPath: fsPathWithTheRightCasing,
          content: await readFileContent(fsPathWithTheRightCasing),
          package: this.#npmPackageMap.hardhatProjectPackage,
        });

      this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

      return {
        success: true,
        value: resolvedFile,
      };
    });
  }

  public async resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<
    Result<
      { file: NpmPackageResolvedFile; remapping?: Remapping },
      NpmRootResolutionError
    >
  > {
    return this.#mutex.exclusiveRun(async () => {
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

      // TODO: The errors here leak data from the import
      if (result.success === false) {
        switch (result.error.type) {
          case ImportResolutionErrorType.IMPORT_WITH_INVALID_NPM_SYNTAX:
          case ImportResolutionErrorType.IMPORT_WITH_WINDOWS_PATH_SEPARATORS: {
            return {
              success: false,
              error: {
                type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_WITH_INVALID_FORMAT,
                npmModule,
              },
            };
          }
          case ImportResolutionErrorType.ILLEGAL_RELATIVE_IMPORT: {
            assertHardhatInvariant(
              false,
              "This could not happen, as we validated that the module name is a valid npm module",
            );
          }
          case ImportResolutionErrorType.IMPORT_DOESNT_EXIST: {
            assertHardhatInvariant(
              result.error.npmPackage !== undefined,
              "We should have a npm package if the import doesn't exist, as we know are doing an npm import",
            );

            return {
              success: false,
              error: {
                ...result.error,
                npmModule,
                type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
              },
            };
          }
          case ImportResolutionErrorType.IMPORT_INVALID_CASING: {
            assertHardhatInvariant(
              result.error.npmPackage !== undefined,
              "We should have a npm package if the import doesn't exist, as we know are doing an npm import",
            );

            return {
              success: false,
              error: {
                ...result.error,
                npmModule,
                type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
              },
            };
          }
          case ImportResolutionErrorType.IMPORT_OF_UNINSTALLED_PACKAGE: {
            return {
              success: false,
              error: {
                ...result.error,
                npmModule,
                type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
              },
            };
          }
          case ImportResolutionErrorType.IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS: {
            return {
              success: false,
              error: {
                ...result.error,
                npmModule,
                installationName: parsedNpmModule.package,
                type: RootResolutionErrorType.NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS,
              },
            };
          }
          case ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE: {
            return {
              success: false,
              error: {
                ...result.error,
                npmModule,
                type: RootResolutionErrorType.NPM_ROOT_FILE_NON_EXPORTED_FILE,
              },
            };
          }
        }
      }

      const resolvedFile = result.value.file;

      assertHardhatInvariant(
        result.value.remapping !== undefined,
        "We must have a remapping here, becase we either resolved though a user remapping, or npm",
      );

      // If resolving this fake import results in using a user remapping, we
      // need to return it.
      //
      // If instead, it results in using a generated remapping for that import,
      // we don't return it, as this is not a real import.
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
          },
        };
      }

      return {
        success: true,
        value: {
          file: resolvedFile,
          remapping,
        },
      };
    });
  }

  public async resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  > {
    return this.#mutex.exclusiveRun(async () =>
      this.#resolveImport(from, importPath),
    );
  }

  async #resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
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
      ? sourceNamePathJoin(path.dirname(from.sourceName), importPath)
      : importPath;

    // If the import is relative, it shouldn't leave its package
    if (isRelativeImport) {
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
    }

    // Now, we get the user remappings for the package, and select
    // the best user remapping, if there's any.
    const packageUserRemappigns = this.#npmPackageMap.getUserRemappings(
      from.package,
    );

    const bestUserRemapping = selectBestRemapping(
      from.sourceName,
      directImport,
      packageUserRemappigns,
    );

    if (isRelativeImport) {
      // Relative imports should be resolved based on the file system, so
      // they should not be affected by user remapping.
      if (bestUserRemapping !== undefined) {
        throw new Error("Invalid relative import and remapping");
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
  }): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  > {
    return 1 as any;
  }

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
    Result<{ file: ResolvedFile; remapping: Remapping }, ImportResolutionError>
  > {
    const remappedDirectImport = applyValidRemapping(directImport, remapping);

    const sourceName = remappedDirectImport;
    const existing = this.#resolvedFileBySourceName.get(remappedDirectImport);
    if (existing !== undefined) {
      return { success: true, value: { file: existing, remapping } };
    }

    const fromNpmPackage =
      from.type === ResolvedFileType.NPM_PACKAGE_FILE
        ? from.package
        : this.#npmPackageMap.hardhatProjectPackage;

    // We get the npm package that's the target of the remapping. If none
    // is present, that's because it's remapping to a local file, so it's
    // the fromNpmPackage.
    const targetNpmPackage =
      remapping.targetNpmPackage?.package ?? fromNpmPackage;

    // A user remapping is created based on the fs path in the package, so
    // we can get the relative path based on the root source name of the target
    // package.
    const relativeSourceNamePath = this.#getRelativeSourceNamePath(
      targetNpmPackage,
      sourceName,
    );

    const relativeFsPath = sourceNamePathToFsPath(relativeSourceNamePath);

    const pathValidation = await validateFsPath(
      targetNpmPackage.rootFsPath,
      relativeFsPath,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            ...this.#buildResolvedFileReference(
              targetNpmPackage,
              relativeSourceNamePath,
              remapping,
            ),
          },
        };
      }

      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: from.fsPath,
          importPath,
          ...this.#buildResolvedFileReference(
            targetNpmPackage,
            relativeSourceNamePath,
            remapping,
          ),
          correctCasing: pathValidation.error.correctCasing,
        },
      };
    }

    const fsPath = path.join(targetNpmPackage.rootFsPath, relativeFsPath);

    const resolvedFile = await this.#buildResolvedFile(
      sourceName,
      fsPath,
      targetNpmPackage,
    );

    this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

    return { success: true, value: { file: resolvedFile, remapping } };
  }

  async #resolveImportThroughNpm({
    from,
    importPath,
    directImport,
  }: {
    from: ResolvedFile;
    importPath: string;
    directImport: string;
  }): Promise<
    Result<{ file: ResolvedFile; remapping: Remapping }, ImportResolutionError>
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
        : this.#npmPackageMap.hardhatProjectPackage;

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

    if (dependencyResolution.remappingErrros !== undefined) {
      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_OF_NPM_PACKAGE_WITH_REMAPPING_ERRORS,
          fromFsPath: from.fsPath,
          importPath,
          npmPackage: dependencyResolution.package,
          remappingErrors: dependencyResolution.remappingErrros,
        },
      };
    }

    const dependency = dependencyResolution.package;

    const subpath = parsedDirectImport.subpath;

    let resolvedSubpath: string | undefined;
    if (dependency.exports !== undefined) {
      const pathResolutionResult = resolveSubpathWithPackageExports(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we just checked this
        dependency as Required<ResolvedNpmPackage>,
        subpath,
      );

      if (pathResolutionResult.success === false) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_OF_NON_EXPORTED_NPM_FILE,
            fromFsPath: from.fsPath,
            importPath,
            ...this.#buildResolvedFileReference(dependency, subpath),
          },
        };
      }

      resolvedSubpath = pathResolutionResult.value;
    }

    const sourceName = sourceNamePathJoin(
      dependency.rootSourceName,
      resolvedSubpath ?? subpath,
    );

    // There are two types of remappings that we may use for npm imports.
    //
    // One is a generic remapping from fromNpmPackage to dependency using
    // installationName.
    //
    // The other one, while more verbose, is a remapping specifically from
    // forNpmPackage into souceName, using directImport.
    //
    // We use the second one in two cases:
    //   - When applying package.exports resolution changes the subpath of the
    //     file.
    //   - When the direct import is `hardhat/console.sol`, as this is a special
    //     case that's never considered local.
    const remapping =
      (resolvedSubpath !== undefined && resolvedSubpath !== subpath) ||
      directImport === "hardhat/console.sol"
        ? await this.#npmPackageMap.generateRemappingIntoNpmFile(
            fromNpmPackage,
            directImport,
            sourceName,
          )
        : dependencyResolution.generatedRemapping;

    const existing = this.#resolvedFileBySourceName.get(sourceName);
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
    const pathValidation = await validateFsPath(
      dependency.rootFsPath,
      relativePath,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST) {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            ...this.#buildResolvedFileReference(
              dependency,
              subpath,
              undefined,
              resolvedSubpath,
            ),
          },
        };
      }

      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: from.fsPath,
          importPath,
          ...this.#buildResolvedFileReference(
            dependency,
            subpath,
            undefined,
            resolvedSubpath,
          ),
          correctCasing: pathValidation.error.correctCasing,
        },
      };
    }

    const fsPath = path.join(dependency.rootFsPath, relativePath);

    const resolvedFile = await this.#buildResolvedFile(
      sourceName,
      fsPath,
      dependency,
    );

    this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

    return {
      success: true,
      value: {
        file: resolvedFile,
        remapping,
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
    while (baseDir.startsWith(from.package.rootFsPath)) {
      if (await exists(path.join(baseDir, importPath))) {
        // TODO: Generate the remapping that would fix it
        throw new Error("Invalid direct import");
      }

      baseDir = path.dirname(baseDir);
    }

    return undefined;
  }

  async #buildResolvedFile(
    sourceName: string,
    fsPath: string,
    npmPackage: ResolvedNpmPackage,
  ): Promise<ResolvedFile> {
    const content = await readFileContent(fsPath);
    if (npmPackage === this.#npmPackageMap.hardhatProjectPackage) {
      return new ProjectResolvedFileImplementation({
        sourceName,
        fsPath,
        content,
        package: this.#npmPackageMap.hardhatProjectPackage,
      });
    }

    return new NpmPackageResolvedFileImplementation({
      sourceName,
      fsPath,
      content: await readFileContent(fsPath),
      package: npmPackage,
    });
  }

  #buildResolvedFileReference(
    targetNpmPackage: ResolvedNpmPackage,
    subpath: string,
    userRemapping?: ResolvedUserRemapping,
    packageExportsResolvedSubpath?: string,
  ): ResolvedFileReference {
    return {
      npmPackage:
        targetNpmPackage !== this.#npmPackageMap.hardhatProjectPackage
          ? targetNpmPackage
          : undefined,
      userRemapping:
        userRemapping === undefined
          ? undefined
          : this.#buildUserRemappingReference(userRemapping),
      subpath,
      packageExportsResolvedSubpath,
    };
  }

  #buildUserRemappingReference(
    userRemapping: ResolvedUserRemapping,
  ): UserRemappingReference {
    return {
      originalUserRemapping: userRemapping.originalFormat,
      actualUserRemapping: formatRemapping(userRemapping),
      remappingSource: userRemapping.source,
    };
  }

  /**
   * Returns the relative source name from the npmPackage's source name root.
   * @param nmpPackage The package
   * @param fileSourceName The file's source name.
   */
  #getRelativeSourceNamePath(
    nmpPackage: ResolvedNpmPackage,
    fileSourceName: string,
  ) {
    if (nmpPackage === this.#npmPackageMap.hardhatProjectPackage) {
      return fileSourceName;
    }

    return fileSourceName.substring(nmpPackage.rootSourceName.length + 1);
  }

  // async #newResolveLocalImport({
  //   from,
  //   importPath,
  //   directImport,
  //   isRelativeImport,
  // }: {
  //   from: ResolvedFile;
  //   importPath: string;
  //   directImport: string;
  //   isRelativeImport: boolean;
  // }): Promise<
  //   Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  // > {
  //   const fromNpmPackage =
  //     from.type === ResolvedFileType.NPM_PACKAGE_FILE
  //       ? from.package
  //       : this.#npmPackageMap.hardhatProjectPackage;

  //   const sourceName = isRelativeImport
  //     ? directImport
  //     : sourceNamePathJoin(fromNpmPackage.rootSourceName, directImport);

  //   // When we have a relative import, solidity will resolve that into
  //   // something equivalent to
  //   // `path.join(path.dirname(from.sourceName), importPath)`, which already
  //   // results in the full source name that we need.
  //   //
  //   // If it's a direct import, like `import "contract/A.sol";` we need to
  //   // generate a remapping that would remap it into
  //   // `path.join(path.dirname(from.sourceName), "contracts/A.sol")`.
  //   //
  //   // When `from` is a Project File, we don't need to do that, because that
  //   // already happens naturally.
  //   const generatedRemapping: Remapping | undefined =
  //     isRelativeImport ||
  //     fromNpmPackage === this.#npmPackageMap.hardhatProjectPackage
  //       ? undefined
  //       : await this.#npmPackageMap.generateRemappingForLocalDirectImport(
  //           fromNpmPackage,
  //           directImport,
  //         );

  //   const existing = this.#resolvedFileBySourceName.get(sourceName);
  //   if (existing !== undefined) {
  //     return {
  //       success: true,
  //       value: { file: existing, remapping: generatedRemapping },
  //     };
  //   }

  //   const relativeSourceNamePath = this.#getRelativeSourceNamePath(
  //     fromNpmPackage,
  //     sourceName,
  //   );

  //   const relativeFsPath = sourceNamePathToFsPath(relativeSourceNamePath);

  //   const fsPath = path.join(fromNpmPackage.rootFsPath, relativeFsPath);

  //   const pathValidation = await validateFsPath(
  //     fromNpmPackage.rootFsPath,
  //     relativeFsPath,
  //   );

  //   if (pathValidation.success === false) {
  //     if (pathValidation.error.type === PathValidationErrorType.DOESNT_EXIST) {
  //       return {
  //         success: false,
  //         error: {
  //           type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
  //           fromFsPath: from.fsPath,
  //           importPath,
  //           ...this.#buildResolvedFileReference(
  //             fromNpmPackage,
  //             relativeSourceNamePath,
  //           ),
  //         },
  //       };
  //     }

  //     if (pathValidation.error.type === PathValidationErrorType.CASING_ERROR) {
  //       return {
  //         success: false,
  //         error: {
  //           type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
  //           fromFsPath: from.fsPath,
  //           importPath,
  //           ...this.#buildResolvedFileReference(
  //             fromNpmPackage,
  //             relativeSourceNamePath,
  //           ),
  //           correctCasing: pathValidation.error.correctCasing,
  //         },
  //       };
  //     }
  //   }

  //   const resolvedFile = await this.#buildResolvedFile(
  //     sourceName,
  //     fsPath,
  //     fromNpmPackage,
  //   );

  //   this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

  //   return {
  //     success: true,
  //     value: { file: resolvedFile, remapping: generatedRemapping },
  //   };
  // }
}

/**
 * Reads and analyzes the file at the given absolute path.
 */
async function readFileContent(absolutePath: string): Promise<FileContent> {
  const text = await readUtf8File(absolutePath);
  const { imports, versionPragmas } = analyze(text);

  return {
    text,
    importPaths: imports,
    versionPragmas,
  };
}

/**
 * Resolves a subpath for a given package, when it uses package#exports
 * @param npmPackage
 * @param subpath
 * @returns
 */
function resolveSubpathWithPackageExports(
  npmPackage: Required<ResolvedNpmPackage>,
  subpath: string,
): Result<string, undefined> {
  let resolveOutput: string[] | void;
  try {
    // As we are resolving Solidity files, the conditions don't really apply,
    // and Solidity package authors don't use them either.
    //
    // We use `resolve.exports` with the appropiate options so that it only
    // takes the `"default"` condition into account.
    resolveOutput = resolve.exports(npmPackage, subpath, {
      browser: false,
      conditions: [],
      require: false,
      unsafe: true,
    });
  } catch (error) {
    ensureError(error, Error);

    return { success: false, error: undefined };
  }

  assertHardhatInvariant(
    resolveOutput !== undefined,
    "resolve.exports should always return a result when package.exports exist",
  );

  const resolvedSubpath = resolveOutput[0]
    .slice(2) // skip the leading './'
    .replace(/\/|\\/g, path.sep); // use fs path separator
  return { success: true, value: resolvedSubpath };
}

enum PathValidationErrorType {
  DOESNT_EXIST = "DOESNT_EXIST",
  CASING_ERROR = "CASING_ERROR",
}

async function validateFsPath(
  from: string,
  relative: string,
): Promise<
  Result<
    undefined,
    | { type: PathValidationErrorType.DOESNT_EXIST }
    | { type: PathValidationErrorType.CASING_ERROR; correctCasing: string }
  >
> {
  let trueCaseFsPath: string;
  try {
    trueCaseFsPath = await getFileTrueCase(from, relative);
  } catch (error) {
    ensureError(error, FileNotFoundError);

    return {
      success: false,
      error: { type: PathValidationErrorType.DOESNT_EXIST },
    };
  }

  if (relative !== trueCaseFsPath) {
    return {
      success: false,
      error: {
        type: PathValidationErrorType.CASING_ERROR,
        correctCasing: trueCaseFsPath,
      },
    };
  }

  return { success: true, value: undefined };
}
