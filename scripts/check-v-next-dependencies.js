// @ts-check
const fs = require("fs");
const path = require("path");

const IGNORED_PACKAGE_FOLDERS = new Set(["hardhat-build-system"]);

/**
 * @typedef {Object} Package
 * @property {string} name
 * @property {Object<string, string>} dependencies
 * @property {Object<string, string>} devDependencies
 * @property {Object<string, string>} peerDependencies
 */

function main() {
  let success = true;

  /**
   * @type {Map<string, Package>}
   */
  const packages = new Map();

  for (const packageJsonPath of getAllPackageJsonPaths()) {
    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`${packageJsonPath} doesn't exist, skipping it`);
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    /**
     * @type {Package}
     */
    const package = {
      name: packageJson.name,
      dependencies: packageJson.dependencies ?? {},
      devDependencies: packageJson.devDependencies ?? {},
      peerDependencies: packageJson.peerDependencies ?? {},
    };

    success &&= checkInternalConsistency(package);

    packages.set(package.name, package);
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
  const packageNames = fs.readdirSync(path.join(__dirname, "..", "v-next"));

  const packageJsons = packageNames
    .filter((p) => !IGNORED_PACKAGE_FOLDERS.has(p))
    .map((p) => path.join(__dirname, "..", "v-next", p, "package.json"));

  return packageJsons;
}

/**
 * Checks that the package's dependencies are consistent internally.
 *
 * @param {Package} package
 * @returns {boolean}
 */
function checkInternalConsistency(package) {
  let success = true;

  /**
   * @type {Map<string, string>}
   */
  const versions = new Map();

  const allDependencies = Object.keys(package.dependencies)
    .concat(Object.keys(package.devDependencies))
    .concat(Object.keys(package.peerDependencies));

  for (const dependency of allDependencies) {
    success &&= validateOrRecordVersion(
      package.name,
      dependency,
      package.dependencies[dependency],
      versions
    );

    success &&= validateOrRecordVersion(
      package.name,
      dependency,
      package.devDependencies[dependency],
      versions
    );

    success &&= validateOrRecordVersion(
      package.name,
      dependency,
      package.peerDependencies[dependency],
      versions
    );
  }

  return success;
}

/**
 * Validates that the package {packageName} has the same version of {dependency} if present
 * in {versions}, otherwise it records the version in {versions}.
 *
 * @param {string} packageName
 * @param {string} dependency
 * @param {string|undefined} version
 * @param {Map<string, string>} versions
 * @return {boolean}
 */
function validateOrRecordVersion(packageName, dependency, version, versions) {
  if (version === undefined) {
    return true;
  }

  if (versions.has(dependency)) {
    if (versions.get(dependency) !== version) {
      console.error(
        `Package ${packageName} has different versions of ${dependency} as dependency/devDependency/peerDependency`
      );

      return false;
    }
  } else {
    versions.set(dependency, version);
  }

  return true;
}

/**
 * Checks that every package has all of its workspace: dependencies' own peerDependencies installed.
 *
 * The reason for this check is that pnpm doesn't install the peerDependencies of the workspace packages,
 * instead, it just symlinks the packages. This is not the same behavior that it has when installing an
 * external package, as it normally autoinstalls the peerDependencies of the external package.
 *
 * @param {Map<string, Package>} packages
 * @returns {boolean}
 */
function checkWorkspacePeerDependencies(packages) {
  let success = true;

  for (const package of packages.values()) {
    const allDependencies = Object.entries(package.dependencies)
      .concat(Object.entries(package.devDependencies))
      .concat(Object.entries(package.peerDependencies));

    for (const [dependencyName, version] of allDependencies) {
      if (!version.startsWith("workspace:")) {
        continue;
      }

      const dependency = packages.get(dependencyName);

      if (dependency === undefined) {
        console.error(
          `Package ${package.name} has a workspace: dependency for ${dependencyName} and ${dependencyName} is not part of the monorepo`
        );

        success = false;

        continue;
      }

      const missingDependencyPeerDependencies = Object.keys(
        dependency.peerDependencies
      ).filter(
        (dependencyPeerDependency) =>
          package.dependencies[dependencyPeerDependency] === undefined &&
          package.devDependencies[dependencyPeerDependency] === undefined &&
          package.peerDependencies[dependencyPeerDependency] === undefined
      );

      if (missingDependencyPeerDependencies.length === 0) {
        continue;
      }

      console.error(
        `Package ${
          package.name
        } has a workspace: dependency for ${dependencyName}, so it should have these packages installed:
  - ${missingDependencyPeerDependencies.join("\n  - ")}
`
      );

      success = false;
    }
  }

  return success;
}

/**
 * Validates that the versions of the packages are the same for all the dependencies in the monorepo.
 *
 * @param {Map<string, Package>} packages
 * @returns {boolean}
 */
function validateSameVersionsSpecs(packages) {
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
 *
 * @param {Map<string, Package>} packages
 * @returns {Map<string, Map<string, Set<string>>>}
 */
function buildDependencyVersionMap(packages) {
  let versionMap = new Map();

  for (const package of packages.values()) {
    const allDependencies = Object.entries(package.dependencies)
      .concat(Object.entries(package.devDependencies))
      .concat(Object.entries(package.peerDependencies));

    for (const [dependencyName, version] of allDependencies) {
      // We ignore workspace: dependencies, as they can have small differences, which are ok,
      // and sometimes intentional.
      if (version.startsWith("workspace:")) {
        continue;
      }

      let dependencyVersions = versionMap.get(dependencyName);

      if (dependencyVersions === undefined) {
        dependencyVersions = new Map();

        versionMap.set(dependencyName, dependencyVersions);
      }

      const dependants = dependencyVersions.get(version);

      if (dependants === undefined) {
        dependencyVersions.set(version, new Set([package.name]));
      } else {
        dependants.add(package.name);
      }
    }
  }

  return versionMap;
}

main();
