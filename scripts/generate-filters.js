// @ts-check
/**
 * This script generates filters for https://github.com/dorny/paths-filter
 *
 * It is used in CI to find all the packages which have been modified or
 * have a dependency (including transitive) that has been modified.
 *
 * This enables running checks only for the packages affected by the changes.
 */
const fs = require("fs");
const path = require("path");

function main() {
  const packageIgnore = JSON.parse(process.env.PACKAGE_IGNORE || "[]");
  const commonFilters = JSON.parse(process.env.COMMON_FILTERS || "[]");

  const pnpmLockfilePath = path.join(__dirname, "..", "pnpm-lock.json");
  if (!fs.existsSync(pnpmLockfilePath)) {
    console.warn(
      `${pnpmLockfilePath} doesn't exist, please run: yq -p yaml -o json pnpm-lock.yaml | tee pnpm-lock.json`
    );
    process.exit(1);
  }

  const pnpmLockfile = JSON.parse(fs.readFileSync(pnpmLockfilePath, "utf8"));

  // Find all direct internal dependencies for all packages
  const internalDependenciesMap = {};
  for (const [package, allDependencies] of Object.entries(
    pnpmLockfile.importers
  )) {
    const internalDependencies = Object.values(allDependencies)
      .flatMap((dependencies) => Object.values(dependencies))
      .map((dependency) => dependency.version)
      .filter((version) => version.startsWith("link:"))
      .map((version) => version.replace("link:", ""))
      .map((version) => path.join(package, version));
    internalDependenciesMap[package] = internalDependencies;
  }

  // Add transitive internal dependencies
  for (const dependencies of Object.values(internalDependenciesMap)) {
    const dependencyQueue = [...dependencies];
    const visited = new Set(dependencies);
    while (dependencyQueue.length !== 0) {
      const dependency = dependencyQueue.pop();
      for (const transitiveDependency of internalDependenciesMap[dependency]) {
        if (!dependencies.includes(transitiveDependency)) {
          dependencies.push(transitiveDependency);
          dependencyQueue.push(transitiveDependency);
          visited.add(transitiveDependency);
        }
      }
    }
  }

  // Generate filters
  const filters = {};
  for (const [package, dependencies] of Object.entries(
    internalDependenciesMap
  )) {
    // Ignore packages that start with one of the prefixes in PACKAGE_IGNORE
    if (packageIgnore.some((prefix) => package.startsWith(prefix))) {
      continue;
    }
    // Calculate glob patterns for the package and its dependencies
    const packageFilters = [package, ...dependencies].map((dependency) =>
      path.join(dependency, "**")
    );
    // Set filters for the package
    filters[package] = [...commonFilters, ...packageFilters];
  }

  // Pretty print the filters
  console.log(JSON.stringify(filters, null, 2));
}

main();
