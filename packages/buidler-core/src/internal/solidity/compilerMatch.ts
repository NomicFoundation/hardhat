import { uniq } from "lodash";
import semver from "semver";

import { MultiSolcConfig, SolcConfig } from "../../types";

import { ResolvedFile } from "./resolver";

export type MatchingCompiler =
  | MatchingCompilerSuccess
  | MatchingCompilerFailure;

export interface MatchingCompilerSuccess {
  config: SolcConfig;
}

export interface MatchingCompilerFailure {
  reason:
    | "nonCompilable"
    | "nonCompilableOverriden"
    | "importsIncompatibleFile"
    | "other";
}

/**
 * Return the compiler config that matches the given version ranges,
 * or a value indicating why the compiler couldn't be obtained.
 */
export function getMatchingCompilerConfig(
  file: ResolvedFile,
  directDependencies: ResolvedFile[],
  transitiveDependencies: ResolvedFile[],
  solidityConfig: MultiSolcConfig
): MatchingCompiler {
  const transitiveDependenciesVersionPragmas = transitiveDependencies.map(
    (x) => x.content.versionPragmas
  );
  const versionRange = uniq([
    ...file.content.versionPragmas,
    ...transitiveDependenciesVersionPragmas,
  ]).join(" ");

  const overrides = solidityConfig.overrides ?? {};

  const overriddenCompiler = overrides[file.globalName];

  // if there's an override, we only check that
  if (overriddenCompiler !== undefined) {
    if (!semver.satisfies(overriddenCompiler.version, versionRange)) {
      return getMatchingCompilerFailure(
        file,
        directDependencies,
        [overriddenCompiler.version],
        true
      );
    }

    return { config: overriddenCompiler };
  }

  // if there's no override, we find a compiler that matches the version range
  const compilerVersions = solidityConfig.compilers.map((x) => x.version);
  const matchingVersion = semver.maxSatisfying(compilerVersions, versionRange);

  if (matchingVersion === null) {
    return getMatchingCompilerFailure(
      file,
      directDependencies,
      compilerVersions,
      false
    );
  }

  const matchingConfig = solidityConfig.compilers.find(
    (x) => x.version === matchingVersion
  )!;

  return {
    config: matchingConfig,
  };
}

function getMatchingCompilerFailure(
  file: ResolvedFile,
  directDependencies: ResolvedFile[],
  compilerVersions: string[],
  overriden: boolean
): MatchingCompilerFailure {
  const fileVersionRange = file.content.versionPragmas.join(" ");
  if (semver.maxSatisfying(compilerVersions, fileVersionRange) === null) {
    const reason = overriden ? "nonCompilableOverriden" : "nonCompilable";
    return { reason };
  }

  for (const dependency of directDependencies) {
    const dependencyVersionRange = dependency.content.versionPragmas.join(" ");
    if (!semver.intersects(fileVersionRange, dependencyVersionRange)) {
      return { reason: "importsIncompatibleFile" };
    }
  }

  return { reason: "other" };
}
