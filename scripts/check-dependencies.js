const fs = require("fs");
const path = require("path");

// An array of dependencies whose version checks are ignored for all the
// packages
const IGNORE_FROM_ALL = ["web3", "hardhat"];

// A map from dependencies to package names where it should be ignored
const IGNORE_FOR_PACKAGES = {
  chai: ["@nomiclabs/hardhat-truffle4", "@nomiclabs/hardhat-truffle5"],
  "@types/chai": ["@nomiclabs/hardhat-truffle4", "@nomiclabs/hardhat-truffle5"],
  "truffle-contract": [
    "@nomiclabs/hardhat-truffle4",
    "@nomiclabs/hardhat-truffle5",
  ],
  ethers: ["@nomiclabs/hardhat-etherscan"],
};

function checkPeerDepedencies(packageJson) {
  if (packageJson.peerDependencies === undefined) {
    return true;
  }

  if (packageJson.devDependencies === undefined) {
    console.error(
      `${packageJson.name} has peerDependencies but no devDependencies`
    );

    return false;
  }

  let success = true;
  for (const dependency of Object.keys(packageJson.peerDependencies)) {
    if (packageJson.devDependencies[dependency] === undefined) {
      console.error(
        `${packageJson.name} has ${dependency} as peerDependency, but not as devDependency`
      );

      success = false;

      continue;
    }

    if (
      packageJson.peerDependencies[dependency] !==
      packageJson.devDependencies[dependency]
    ) {
      console.error(
        `${packageJson.name} has different versions of ${dependency} as peerDependency and devDependency`
      );

      success = false;
    }
  }

  return success;
}

function addDependencies(packageName, dependenciesToAdd, allDependenciesMap) {
  if (dependenciesToAdd === undefined) {
    return;
  }

  for (const [name, spec] of Object.entries(dependenciesToAdd)) {
    if (IGNORE_FROM_ALL.includes(name)) {
      continue;
    }

    if (
      IGNORE_FOR_PACKAGES[name] !== undefined &&
      IGNORE_FOR_PACKAGES[name].includes(packageName)
    ) {
      continue;
    }

    if (allDependenciesMap[name] === undefined) {
      allDependenciesMap[name] = {};
    }

    if (allDependenciesMap[name][spec] === undefined) {
      allDependenciesMap[name][spec] = new Set();
    }

    allDependenciesMap[name][spec].add(packageName);
  }
}

function getDependencyMap(packageJson) {
  // Map of: dependencyName => versionSpec => set of module names
  const dependencies = {};

  addDependencies(packageJson.name, packageJson.dependencies, dependencies);
  addDependencies(packageJson.name, packageJson.devDependencies, dependencies);
  addDependencies(packageJson.name, packageJson.peerDependencies, dependencies);

  return dependencies;
}

function mergeDependenciesMap(dependencyMaps) {
  // Map of: dependencyName => versionSpec => set of module names
  const dependencies = {};

  for (const map of dependencyMaps) {
    for (const [name, specs] of Object.entries(map)) {
      if (dependencies[name] === undefined) {
        dependencies[name] = {};
      }

      for (const spec of Object.keys(specs)) {
        if (dependencies[name][spec] === undefined) {
          dependencies[name][spec] = new Set();
        }

        for (const packageName of map[name][spec]) {
          dependencies[name][spec].add(packageName);
        }
      }
    }
  }

  return dependencies;
}

function getAllPackageJsonPaths() {
  const packageNames = fs.readdirSync(path.join(__dirname, "..", "packages"));

  const packageJsons = packageNames.map((p) =>
    path.join(__dirname, "..", "packages", p, "package.json")
  );

  packageJsons.push(path.join(__dirname, "..", "package.json"));
  packageJsons.push(path.join(__dirname, "..", "docs", "package.json"));

  return packageJsons;
}

function main() {
  let success = true;
  const dependencyMaps = [];
  for (const packageJsonPath of getAllPackageJsonPaths()) {
    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`${packageJsonPath} doesn't exist, skipping it`);
      continue;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const peersOk = checkPeerDepedencies(packageJson);
    const dependencyMap = getDependencyMap(packageJson);
    dependencyMaps.push(dependencyMap);

    if (peersOk === false) {
      success = false;
    }
  }

  const allDependenciesMap = mergeDependenciesMap(dependencyMaps);

  for (const dependency of Object.keys(allDependenciesMap)) {
    if (Object.keys(allDependenciesMap[dependency]).length !== 1) {
      console.error(`Incompatible versions of dependency: ${dependency}`);

      for (const [spec, packageNames] of Object.entries(
        allDependenciesMap[dependency]
      )) {
        console.log(`  Packages with version ${spec}:`);

        for (const packageName of packageNames) {
          console.log(`    ${packageName}`);
        }
      }

      success = false;
    }
  }

  if (success === false) {
    process.exit(1);
  }
}

main();
