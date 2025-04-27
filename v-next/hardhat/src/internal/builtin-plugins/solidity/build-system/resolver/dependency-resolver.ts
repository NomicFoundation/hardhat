import type { ResolvedUserRemapping } from "./remapped-npm-packages-map.js";
import type { Remapping, Resolver } from "./types.js";
import type {
  ImportResolutionError,
  ProjectRootResolutionError,
  RootResolutionError,
  UserRemappingError,
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

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  getFileTrueCase,
  readUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
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

import {
  getDirectImportLocalDesambiguationPrefix,
  isLocalDirectImport,
} from "./imports-clasification.js";
import { parseNpmDirectImport } from "./npm-moudles-parsing.js";
import { RemappedNpmPackagesMap } from "./remapped-npm-packages-map.js";
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

export class ResolverImplementation implements Resolver {
  readonly #projectRoot: string;
  readonly #npmPackageMap: RemappedNpmPackagesMap;

  /**
   * IMPORTANT: This mutex must be acquired before writing to any of the mutable
   * fields of this class. We do this by using the mutex in the public methods,
   * which don't call each other.
   */
  readonly #mutex = new AsyncMutex();

  /**
   * We use this map to ensure that we only resolve each file once.
   **/
  readonly #resolvedFileBySourceName: Map<string, ResolvedFile> = new Map();

  // TODO: This is just a temporary workaround, where we store every remapping
  // we use, and then return them all in getRemappings.
  //
  // Instead, we should keep track of the remappings in the dependency graph.
  readonly #remappings: Remapping[] = [];

  /**
   * Legacy version of the create method to make this compile while we work
   * on bubbling the errors.
   * @param projectRoot
   * @param configUserRemappings
   */
  public static async create(
    projectRoot: string,
    configUserRemappings: string[],
  ): Promise<Resolver> {
    const result = await ResolverImplementation.newCreate(
      projectRoot,
      configUserRemappings,
    );

    if (result.success === true) {
      return result.value;
    }

    throw new Error(
      "TODO: Remapping errors while creating a resolver: " +
        JSON.stringify(result.error, null, 2),
    );
  }

  /**
   * Creates a new Resolver.
   *
   * @param projectRoot The absolute path to the Hardhat project root.
   * @param configUserRemappings The remappings provided by the user in their
   *  Hardhat config.
   */
  public static async newCreate(
    projectRoot: string,
    configUserRemappings: string[],
  ): Promise<Result<Resolver, UserRemappingError[]>> {
    const result = await RemappedNpmPackagesMap.create(
      projectRoot,
      configUserRemappings,
    );

    if (result.success === false) {
      return result;
    }

    return {
      success: true,
      value: new ResolverImplementation(projectRoot, result.value),
    };
  }

  private constructor(
    projectRoot: string,
    npmPackagesMap: RemappedNpmPackagesMap,
  ) {
    this.#projectRoot = projectRoot;
    this.#npmPackageMap = npmPackagesMap;
  }

  public async resolveProjectFile(
    absoluteFilePath: string,
  ): Promise<ProjectResolvedFile> {
    const result = await this.newResolveProjectFile(absoluteFilePath);
    if (result.success === false) {
      throw new Error(
        "Error resolving project file:" + JSON.stringify(result.error, null, 2),
      );
    }

    return result.value;
  }

  public async resolveNpmDependencyFileAsRoot(
    npmModule: string,
  ): Promise<NpmPackageResolvedFile> {
    const result = await this.newResolveNpmPackageFileAsRoot(npmModule);
    if (result.success === false) {
      throw new Error(
        "Error resolving npm root:" + JSON.stringify(result.error, null, 2),
      );
    }

    this.#remappings.push(result.value.remapping);

    return result.value.file;
  }

  public async resolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<ResolvedFile> {
    const result = await this.newResolveImport(from, importPath);

    if (result.success === false) {
      throw new Error(
        "Error resolving import:" + JSON.stringify(result.error, null, 2),
      );
    }

    if (result.value.remapping !== undefined) {
      this.#remappings.push(result.value.remapping);
    }

    return result.value.file;
  }

  public async newResolveProjectFile(
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
      let sourceName = fsPathToSourceNamePath(relativeFilePath);
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

      let trueCaseFsPath: string;
      try {
        trueCaseFsPath = await getFileTrueCase(
          this.#projectRoot,
          relativeFilePath,
        );
      } catch (error) {
        ensureError(error, FileNotFoundError);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.RESOLVING_NONEXISTENT_PROJECT_FILE,
          { file: shortenPath(absoluteFilePath) },
          error,
        );
      }

      // Now that we have the correct casing, we "fix" the source name.
      sourceName = fsPathToSourceNamePath(trueCaseFsPath);

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
        trueCaseFsPath,
      );

      const resolvedFile: ProjectResolvedFile =
        new ProjectResolvedFileImplementation({
          sourceName,
          fsPath: fsPathWithTheRightCasing,
          content: await readFileContent(fsPathWithTheRightCasing),
        });

      this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

      return {
        success: true,
        value: resolvedFile,
      };
    });
  }

  public async newResolveNpmPackageFileAsRoot(
    npmModule: string,
  ): Promise<
    Result<
      { file: NpmPackageResolvedFile; remapping: Remapping },
      RootResolutionError
    >
  > {
    return this.#mutex.exclusiveRun(async () => {
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

      if (await isLocalDirectImport(this.#projectRoot, npmModule)) {
        const directory = getDirectImportLocalDesambiguationPrefix(npmModule);

        return {
          success: false,
          error: {
            type: RootResolutionErrorType.NPM_ROOT_FILE_NAME_CLASHES_WITH_PROJECT_FILE,
            npmModule,
            directory,
          },
        };
      }

      const hardhatProjectUserRemappings =
        this.#npmPackageMap.getUserRemappings(
          this.#npmPackageMap.hardhatProjectPackage,
        );

      const bestUserRemapping = selectBestRemapping(
        this.#npmPackageMap.hardhatProjectPackage.rootSourceName,
        npmModule,
        hardhatProjectUserRemappings,
      );

      let remapping: Remapping;
      let npmPackage: ResolvedNpmPackage;
      let sourceName: string;
      let subpath: string;

      if (bestUserRemapping !== undefined) {
        if (
          bestUserRemapping.targetNpmPackage === undefined ||
          bestUserRemapping.targetNpmPackage.package ===
            this.#npmPackageMap.hardhatProjectPackage
        ) {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
              npmModule,
              userRemapping: {
                originalUserRemapping: bestUserRemapping.originalFormat,
                actualUserRemapping: formatRemapping(bestUserRemapping),
                remappingSource: bestUserRemapping.source,
              },
            },
          };
        }

        remapping = bestUserRemapping;

        npmPackage = bestUserRemapping.targetNpmPackage.package;
        sourceName = applyValidRemapping(npmModule, bestUserRemapping);
        // If we found a user remapping, the subpath comes the remapped
        // source name. We use pre-package.exports subpaths for source names,
        // so it matches the subpath.
        subpath = sourceName.substring(npmPackage.rootSourceName.length + 1);
      } else {
        const dependencyResolution =
          await this.#npmPackageMap.resolveDependencyByInstallationName(
            this.#npmPackageMap.hardhatProjectPackage,
            parsedNpmModule.package,
          );

        if (dependencyResolution === undefined) {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_OF_UNINSTALLED_PACKAGE,
              npmModule,
              packageName: parsedNpmModule.package,
            },
          };
        }

        if (dependencyResolution.remappingErrros !== undefined) {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_OF_PACKAGE_WITH_REMAPPING_ERRORS,
              npmModule,
              installationName: parsedNpmModule.package,
              packageName: dependencyResolution.package.name,
              remappingErrors: dependencyResolution.remappingErrros,
            },
          };
        }

        remapping = dependencyResolution.generatedRemapping;
        npmPackage = dependencyResolution.package;
        subpath = parsedNpmModule.subpath;
        sourceName = sourceNamePathJoin(
          dependencyResolution.package.rootSourceName,
          subpath,
        );

        if (npmPackage === this.#npmPackageMap.hardhatProjectPackage) {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_RESOLVES_TO_PROJECT_FILE,
              npmModule,
            },
          };
        }
      }

      const existing = this.#resolvedFileBySourceName.get(sourceName);

      if (existing !== undefined) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- This has to be an npm package file, because it's source name is based
      on an npm package, that we checked is not the Hardhat project's */
        const existingNpmResolvedFile = existing as NpmPackageResolvedFile;

        return {
          success: true,
          value: { file: existingNpmResolvedFile, remapping },
        };
      }

      const resolvedSubpath = resolveSubpathWithPackageExports(
        npmPackage,
        subpath,
      );

      const pathValidation = await validateFsPath(
        npmPackage.rootFsPath,
        resolvedSubpath,
      );

      if (pathValidation.success === false) {
        if (pathValidation.error.type === "DOESNT_EXIST") {
          return {
            success: false,
            error: {
              type: RootResolutionErrorType.NPM_ROOT_FILE_DOESNT_EXIST_WITHIN_ITS_PACKAGE,
              npmModule,
              userRemapping:
                bestUserRemapping !== undefined
                  ? {
                      originalUserRemapping: bestUserRemapping.originalFormat,
                      actualUserRemapping: formatRemapping(bestUserRemapping),
                      remappingSource: bestUserRemapping.source,
                    }
                  : undefined,
              target: {
                npmPackage,
                subpath,
                resolvedSubpath:
                  npmPackage.exports !== undefined
                    ? resolvedSubpath
                    : undefined,
              },
            },
          };
        }

        return {
          success: false,
          error: {
            type: RootResolutionErrorType.NPM_ROOT_FILE_WITH_INCORRRECT_CASING,
            npmModule,
            userRemapping:
              bestUserRemapping !== undefined
                ? {
                    originalUserRemapping: bestUserRemapping.originalFormat,
                    actualUserRemapping: formatRemapping(bestUserRemapping),
                    remappingSource: bestUserRemapping.source,
                  }
                : undefined,
            target: {
              npmPackage,
              subpath,
              resolvedSubpath:
                npmPackage.exports !== undefined ? resolvedSubpath : undefined,
            },
            correctCasing: pathValidation.error.correctCasing,
          },
        };
      }

      const fsPath = path.join(npmPackage.rootFsPath, resolvedSubpath);

      const resolvedFile = await this.#buildResolvedFile(
        sourceName,
        fsPath,
        npmPackage,
      );

      this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

      return {
        success: true,
        value: {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- We know that it's an npm package file, because we just created it
        with an npm package that's not the hardhat project.
        */
          file: resolvedFile as NpmPackageResolvedFile,
          remapping,
        },
      };
    });
  }

  public async newResolveImport(
    from: ResolvedFile,
    importPath: string,
  ): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  > {
    return this.#mutex.exclusiveRun(async () => {
      let directImport = importPath;

      // We first validate that the import path doesn't include a windows
      // separator.
      if (path.sep !== "/" && importPath.includes(path.sep)) {
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

      // For relative imports, we first resolve the import path into a direct
      // import, as solc would do.
      //
      // We also need to validate that it doesn't abuse the import path syntax.
      if (isRelativeImport) {
        directImport = sourceNamePathJoin(
          path.dirname(from.sourceName),
          importPath,
        );

        // We also check that resolving the import paths into direct imports
        // doesn't result in accessing a file outside of the npm package/project
        if (from.type === ResolvedFileType.NPM_PACKAGE_FILE) {
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
        } else {
          if (directImport.startsWith("../")) {
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
      }

      const fromNpmPackage =
        from.type === ResolvedFileType.NPM_PACKAGE_FILE
          ? from.package
          : this.#npmPackageMap.hardhatProjectPackage;

      // While the remappings get presedence over local imports, we need
      // to compute if an import could have been considered local before
      // applying the remappings, as it can affect how they are applied.
      //
      // There are two cases in which an import is considered local:
      //  - If it's a relative import
      //  - If it's a direct import and isLocalDirectImport evaluates to true

      const isDirectImportFromPackageRoot =
        !isRelativeImport &&
        (await isLocalDirectImport(fromNpmPackage.rootFsPath, directImport));

      const isLocalImport = isRelativeImport || isDirectImportFromPackageRoot;

      // Now, we get the user remappings for the package/project, and select
      // the best user remapping. If there's any, we prioritize that.
      const packageUserRemappigns =
        this.#npmPackageMap.getUserRemappings(fromNpmPackage);

      const bestUserRemapping = selectBestRemapping(
        from.sourceName,
        directImport,
        packageUserRemappigns,
      );

      if (bestUserRemapping !== undefined) {
        const remappedDirectImport = applyValidRemapping(
          directImport,
          bestUserRemapping,
        );

        // Resolve based on the remappings
        return this.#newResolveUserRemappedImport({
          from,
          importPath,
          remappedDirectImport,
          remapping: bestUserRemapping,
          isLocalImport,
        });
      }

      // After user remappings, local imports take presedence

      if (isLocalImport) {
        return this.#newResolveLocalImport({
          from,
          importPath,
          directImport,
          isRelativeImport,
        });
      }

      return this.#newResolveImportThroughNpm({
        from,
        importPath,
        directImport,
      });
    });
  }

  async #newResolveUserRemappedImport({
    from,
    importPath,
    remappedDirectImport,
    remapping,
    isLocalImport,
  }: {
    from: ResolvedFile;
    importPath: string;
    isLocalImport: boolean;
    remappedDirectImport: string;
    remapping: ResolvedUserRemapping;
  }): Promise<
    Result<{ file: ResolvedFile; remapping: Remapping }, ImportResolutionError>
  > {
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

    // We get the relative path from the root, normally referred to as
    // `subpath` in npm land.
    // We create the source names using this pre-package.exports resolution
    // subpath.
    const subpath = path.relative(targetNpmPackage.rootSourceName, sourceName);

    // We apply the package.exports resolution in every case, except
    // when a package is importing itself with a direct import.
    // E.g. `import "contracts/File.sol";`
    //
    // We don't do that, because if you were in that same package, that would
    // be considered a local import and package.exports would be ignored.
    //
    // We want to match that behavior here.
    const applyPackageExportsResolution =
      targetNpmPackage.exports !== undefined &&
      (targetNpmPackage !== fromNpmPackage || !isLocalImport);

    const resolvedSubpath = applyPackageExportsResolution
      ? resolveSubpathWithPackageExports(targetNpmPackage, subpath)
      : subpath;

    const pathValidation = await validateFsPath(
      targetNpmPackage.rootFsPath,
      resolvedSubpath,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === "DOESNT_EXIST") {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            userRemapping: {
              originalUserRemapping: remapping.originalFormat,
              actualUserRemapping: formatRemapping(remapping),
              remappingSource: remapping.source,
            },
            target: {
              npmPackage:
                targetNpmPackage !== this.#npmPackageMap.hardhatProjectPackage
                  ? targetNpmPackage
                  : undefined,
              subpath,
              resolvedSubpath: applyPackageExportsResolution
                ? resolvedSubpath
                : undefined,
            },
          },
        };
      }

      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: from.fsPath,
          importPath,
          userRemapping: {
            originalUserRemapping: remapping.originalFormat,
            actualUserRemapping: formatRemapping(remapping),
            remappingSource: remapping.source,
          },
          target: {
            npmPackage:
              targetNpmPackage !== this.#npmPackageMap.hardhatProjectPackage
                ? targetNpmPackage
                : undefined,
            subpath,
            resolvedSubpath: applyPackageExportsResolution
              ? resolvedSubpath
              : undefined,
          },
          correctCasing: pathValidation.error.correctCasing,
        },
      };
    }

    const fsPath = path.join(targetNpmPackage.rootFsPath, resolvedSubpath);

    const resolvedFile = await this.#buildResolvedFile(
      sourceName,
      fsPath,
      targetNpmPackage,
    );

    this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

    return { success: true, value: { file: resolvedFile, remapping } };
  }

  async #newResolveLocalImport({
    from,
    importPath,
    directImport,
    isRelativeImport,
  }: {
    from: ResolvedFile;
    importPath: string;
    directImport: string;
    isRelativeImport: boolean;
  }): Promise<
    Result<{ file: ResolvedFile; remapping?: Remapping }, ImportResolutionError>
  > {
    const fromNpmPackage =
      from.type === ResolvedFileType.NPM_PACKAGE_FILE
        ? from.package
        : this.#npmPackageMap.hardhatProjectPackage;

    const sourceName = isRelativeImport
      ? directImport
      : sourceNamePathJoin(fromNpmPackage.rootSourceName, directImport);

    const generatedRemapping: Remapping | undefined = isRelativeImport
      ? undefined
      : await this.#npmPackageMap.generateRemappingForLocalDirectImport(
          fromNpmPackage,
          directImport,
        );

    const existing = this.#resolvedFileBySourceName.get(sourceName);
    if (existing !== undefined) {
      return {
        success: true,
        value: { file: existing, remapping: generatedRemapping },
      };
    }

    const relativeFsPath =
      fromNpmPackage === this.#npmPackageMap.hardhatProjectPackage
        ? sourceNamePathToFsPath(sourceName)
        : sourceNamePathToFsPath(
            sourceName.substring(fromNpmPackage.rootSourceName.length + 1),
          );

    const fsPath = path.join(fromNpmPackage.rootFsPath, relativeFsPath);

    const pathValidation = await validateFsPath(
      fromNpmPackage.rootFsPath,
      relativeFsPath,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === "DOESNT_EXIST") {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            target: {
              npmPackage:
                fromNpmPackage !== this.#npmPackageMap.hardhatProjectPackage
                  ? fromNpmPackage
                  : undefined,
              subpath: relativeFsPath,
            },
          },
        };
      }

      if (pathValidation.error.type === "CASING_ERROR") {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
            fromFsPath: from.fsPath,
            importPath,
            target: {
              npmPackage:
                fromNpmPackage !== this.#npmPackageMap.hardhatProjectPackage
                  ? fromNpmPackage
                  : undefined,
              subpath: relativeFsPath,
            },
            correctCasing: pathValidation.error.correctCasing,
          },
        };
      }
    }

    const resolvedFile = await this.#buildResolvedFile(
      sourceName,
      fsPath,
      fromNpmPackage,
    );

    this.#resolvedFileBySourceName.set(sourceName, resolvedFile);

    return {
      success: true,
      value: { file: resolvedFile, remapping: generatedRemapping },
    };
  }

  async #newResolveImportThroughNpm({
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
          packageName: parsedDirectImport.package,
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
          installationName: parsedDirectImport.package,
          packageName: dependencyResolution.package.name,
          remappingErrors: dependencyResolution.remappingErrros,
        },
      };
    }

    const dependency = dependencyResolution.package;

    const sourceName = sourceNamePathJoin(
      dependency.rootSourceName,
      parsedDirectImport.subpath,
    );

    const existing = this.#resolvedFileBySourceName.get(sourceName);
    if (existing !== undefined) {
      return {
        success: true,
        value: {
          file: existing,
          remapping: dependencyResolution.generatedRemapping,
        },
      };
    }

    const subpath = parsedDirectImport.subpath;

    // We use the subpath (pre-resolution) to create source names
    const resolvedSubpath = resolveSubpathWithPackageExports(
      dependency,
      parsedDirectImport.subpath,
    );

    const pathValidation = await validateFsPath(
      dependency.rootFsPath,
      resolvedSubpath,
    );

    if (pathValidation.success === false) {
      if (pathValidation.error.type === "DOESNT_EXIST") {
        return {
          success: false,
          error: {
            type: ImportResolutionErrorType.IMPORT_DOESNT_EXIST,
            fromFsPath: from.fsPath,
            importPath,
            target: {
              npmPackage:
                dependency !== this.#npmPackageMap.hardhatProjectPackage
                  ? dependency
                  : undefined,
              subpath,
              resolvedSubpath:
                dependency.exports !== undefined ? resolvedSubpath : undefined,
            },
          },
        };
      }

      return {
        success: false,
        error: {
          type: ImportResolutionErrorType.IMPORT_INVALID_CASING,
          fromFsPath: from.fsPath,
          importPath,
          target: {
            npmPackage:
              dependency !== this.#npmPackageMap.hardhatProjectPackage
                ? dependency
                : undefined,
            subpath,
            resolvedSubpath:
              dependency.exports !== undefined ? resolvedSubpath : undefined,
          },
          correctCasing: pathValidation.error.correctCasing,
        },
      };
    }

    const fsPath = path.join(dependency.rootFsPath, resolvedSubpath);

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
        remapping: dependencyResolution.generatedRemapping,
      },
    };
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
      });
    }

    return new NpmPackageResolvedFileImplementation({
      sourceName,
      fsPath,
      content: await readFileContent(fsPath),
      package: npmPackage,
    });
  }

  // TODO: Remove this, the remappings should stored in the dependency graph.
  public getRemappings(): Remapping[] {
    // TODO: This isn't handling the special case that's `hardhat/console.sol`,
    // we need to have access to the dependency graph edge (i.e. its importPath)
    // to handle it.
    //
    // Right now it remaps the entire `hardhat/` package into npm, even if
    // there's a `hardhat/` folder.
    return [...this.#remappings]
      .sort((a, b) => a.target.localeCompare(b.target))
      .sort((a, b) => a.target.length - b.target.length)
      .sort((a, b) => a.prefix.localeCompare(b.prefix))
      .sort((a, b) => a.prefix.length - b.prefix.length)
      .sort((a, b) => a.context.localeCompare(b.context))
      .sort((a, b) => a.context.length - b.context.length);
  }
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
  npmPackage: ResolvedNpmPackage,
  subpath: string,
): string {
  if (npmPackage.exports === undefined) {
    return subpath;
  }
  try {
    // As we are resolving Solidity files, the conditions don't really apply,
    // and Solidity package authors don't use them either.
    //
    // We use `resolve.exports` with the appropiate options so that it only
    // takes the `"default"` condition into account.
    const resolveOutput = resolve.exports(npmPackage, subpath, {
      browser: false,
      conditions: [],
      require: false,
      unsafe: true,
    });

    assertHardhatInvariant(
      resolveOutput !== undefined,
      "resolve.exports should always return a result when package.exports exist",
    );

    const resolvedSubpath = resolveOutput[0].slice(2); // skip the leading './'

    return resolvedSubpath.replace(/\/|\\/g, path.sep); // use fs path separator
  } catch (error) {
    ensureError(error, Error);

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.RESOLVE_NOT_EXPORTED_NPM_FILE,
      { module: `${npmPackage.name}/${subpath}` },
      error,
    );
  }
}

async function validateFsPath(
  from: string,
  relative: string,
): Promise<
  Result<
    undefined,
    { type: "DOESNT_EXIST" } | { type: "CASING_ERROR"; correctCasing: string }
  >
> {
  let trueCaseFsPath: string;
  try {
    trueCaseFsPath = await getFileTrueCase(from, relative);
  } catch (error) {
    ensureError(error, FileNotFoundError);

    return { success: false, error: { type: "DOESNT_EXIST" } };
  }

  if (relative !== trueCaseFsPath) {
    return {
      success: false,
      error: { type: "CASING_ERROR", correctCasing: trueCaseFsPath },
    };
  }

  return { success: true, value: undefined };
}
