import fs from "node:fs";
import path from "node:path";

interface Package {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

const IGNORED_PACKAGE_FOLDERS = new Set(["hardhat-build-system"]);

// Packages that are allowed to have a different version spec for a given
// dependency. These packages are excluded from the cross-package version
// consistency check for the specified dependency, but are still checked for
// internal consistency.
const ALLOWED_DIFFERENT_VERSION_SPECS = new Map([
  [
    "chai",
    new Set([
      "@nomicfoundation/hardhat-ethers-chai-matchers",
      "@nomicfoundation/hardhat-toolbox-mocha-ethers",
    ]),
  ],
]);

function main() {
  let success = true;

  const packages: Map<string, Package> = new Map();

  for (const packageJsonPath of getAllPackageJsonPaths()) {
    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`${packageJsonPath} doesn't exist, skipping it`);
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    const pkg: Package = {
      name: packageJson.name,
      dependencies: packageJson.dependencies ?? {},
      devDependencies: packageJson.devDependencies ?? {},
      peerDependencies: packageJson.peerDependencies ?? {},
    };

    success &&= checkInternalConsistency(pkg);

    packages.set(pkg.name, pkg);
  }

  if (success === false) {
    process.exit(1);
  }

  success &&= validateSameVersionsSpecs(packages);
  success &&= checkWorkspacePeerDependencies(packages);

  if (success === false) {
    process.exit(1);
  }
}

function getAllPackageJsonPaths() {
  const packageNames = fs.readdirSync(
    path.join(import.meta.dirname, "..", "packages"),
  );

  const packageJsons = packageNames
    .filter((p) => !IGNORED_PACKAGE_FOLDERS.has(p))
    .map((p) =>
      path.join(import.meta.dirname, "..", "packages", p, "package.json"),
    );

  return packageJsons;
}

/**
 * Checks that the package's dependencies are consistent internally.
 */
function checkInternalConsistency(pkg: Package): boolean {
  let success = true;

  const versions: Map<string, string> = new Map();

  const allDependencies = Object.keys(pkg.dependencies)
    .concat(Object.keys(pkg.devDependencies))
    .concat(Object.keys(pkg.peerDependencies));

  for (const dependency of allDependencies) {
    success &&= validateOrRecordVersion(
      pkg.name,
      dependency,
      pkg.dependencies[dependency],
      versions,
    );

    success &&= validateOrRecordVersion(
      pkg.name,
      dependency,
      pkg.devDependencies[dependency],
      versions,
    );

    success &&= validateOrRecordVersion(
      pkg.name,
      dependency,
      pkg.peerDependencies[dependency],
      versions,
    );
  }

  return success;
}

/**
 * Validates that the package {packageName} has the same version of {dependency}
 * if present in {versions}, otherwise it records the version in {versions}.
 */
function validateOrRecordVersion(
  packageName: string,
  dependency: string,
  version: string | undefined,
  versions: Map<string, string>,
): boolean {
  if (version === undefined) {
    return true;
  }

  if (versions.has(dependency)) {
    if (versions.get(dependency) !== version) {
      console.error(
        `Package ${packageName} has different versions of ${dependency} as dependency/devDependency/peerDependency`,
      );

      return false;
    }
  } else {
    versions.set(dependency, version);
  }

  return true;
}

/**
 * Checks that every package has all of its workspace: dependencies' own
 * peerDependencies installed.
 *
 * The reason for this check is that pnpm doesn't install the peerDependencies
 * of the workspace packages, instead, it just symlinks the packages. This is
 * not the same behavior that it has when installing an external package, as it
 * normally autoinstalls the peerDependencies of the external package.
 */
function checkWorkspacePeerDependencies(
  packages: Map<string, Package>,
): boolean {
  let success = true;

  for (const pkg of packages.values()) {
    const allDependencies = Object.entries(pkg.dependencies)
      .concat(Object.entries(pkg.devDependencies))
      .concat(Object.entries(pkg.peerDependencies)) as [string, string][];

    for (const [dependencyName, version] of allDependencies) {
      if (!version.startsWith("workspace:")) {
        continue;
      }

      const dependency = packages.get(dependencyName);

      if (dependency === undefined) {
        console.error(
          `Package ${pkg.name} has a workspace: dependency for ${dependencyName} and ${dependencyName} is not part of the monorepo`,
        );

        success = false;

        continue;
      }

      const missingDependencyPeerDependencies = Object.keys(
        dependency.peerDependencies,
      ).filter(
        (dependencyPeerDependency) =>
          pkg.dependencies[dependencyPeerDependency] === undefined &&
          pkg.devDependencies[dependencyPeerDependency] === undefined &&
          pkg.peerDependencies[dependencyPeerDependency] === undefined,
      );

      if (missingDependencyPeerDependencies.length === 0) {
        continue;
      }

      console.error(
        `Package ${
          pkg.name
        } has a workspace: dependency for ${dependencyName}, so it should have these packages installed:
  - ${missingDependencyPeerDependencies.join("\n  - ")}
`,
      );

      success = false;
    }
  }

  return success;
}

/**
 * Validates that the versions of the packages are the same for all the
 * dependencies in the monorepo.
 */
function validateSameVersionsSpecs(packages: Map<string, Package>): boolean {
  let success = true;

  const versionMap = buildDependencyVersionMap(packages);

  for (const [dependencyName, versionSpecs] of versionMap.entries()) {
    if (versionSpecs.size === 1) {
      continue;
    }

    console.error(`Incompatible versions of dependency: ${dependencyName}`);

    for (const [spec, packageNames] of versionSpecs.entries()) {
      console.error(`  Packages with version ${spec}:`);

      for (const packageName of packageNames) {
        console.error(`    ${packageName}`);
      }
    }

    success = false;
  }

  return success;
}

/**
 * Builds a map from dependency name, to version spec, to the set of packages that have that dependency.
 */
function buildDependencyVersionMap(
  packages: Map<string, Package>,
): Map<string, Map<string, Set<string>>> {
  let versionMap = new Map();

  for (const pkg of packages.values()) {
    const allDependencies = Object.entries(pkg.dependencies)
      .concat(Object.entries(pkg.devDependencies))
      .concat(Object.entries(pkg.peerDependencies)) as [string, string][];

    for (const [dependencyName, version] of allDependencies) {
      // We ignore workspace: dependencies, as they can have small differences,
      // which are ok, and sometimes intentional.
      if (version.startsWith("workspace:")) {
        continue;
      }

      // Skip packages that are allowed to have different version specs for this
      // dependency
      const allowedPackages =
        ALLOWED_DIFFERENT_VERSION_SPECS.get(dependencyName);
      if (allowedPackages !== undefined && allowedPackages.has(pkg.name)) {
        continue;
      }

      let dependencyVersions = versionMap.get(dependencyName);

      if (dependencyVersions === undefined) {
        dependencyVersions = new Map();

        versionMap.set(dependencyName, dependencyVersions);
      }

      const dependants = dependencyVersions.get(version);

      if (dependants === undefined) {
        dependencyVersions.set(version, new Set([pkg.name]));
      } else {
        dependants.add(pkg.name);
      }
    }
  }

  return versionMap;
}

main();
