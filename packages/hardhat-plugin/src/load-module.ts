import { IgnitionModule } from "@nomicfoundation/ignition-core";
import setupDebug from "debug";
import { existsSync, pathExistsSync } from "fs-extra";
import { HardhatPluginError } from "hardhat/plugins";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

const MODULES_FOLDER = "modules";

export function loadModule(
  ignitionDirectory: string,
  moduleNameOrPath: string
): IgnitionModule | undefined {
  const fullModulesDirectoryName = path.resolve(
    ignitionDirectory,
    MODULES_FOLDER
  );

  const shortModulesDirectoryName = path.join(
    ignitionDirectory,
    MODULES_FOLDER
  );

  if (!existsSync(ignitionDirectory)) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `Ignition directory ${ignitionDirectory} not found.`
    );
  }

  if (!existsSync(fullModulesDirectoryName)) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `Ignition modules directory ${shortModulesDirectoryName} not found.`
    );
  }

  debug(`Loading user modules from '${fullModulesDirectoryName}'`);

  const fullpathToModule = resolveFullPathToModule(
    fullModulesDirectoryName,
    moduleNameOrPath
  );

  if (fullpathToModule === undefined) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `Could not find module ${moduleNameOrPath}`
    );
  }

  if (!isInModuleDirectory(fullModulesDirectoryName, fullpathToModule)) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `The referenced module ${moduleNameOrPath} is outside the module directory ${shortModulesDirectoryName}`
    );
  }

  debug(`Loading module file '${fullpathToModule}'`);

  const module = require(fullpathToModule);

  return module.default ?? module;
}

function resolveFullPathToModule(
  modulesDirectory: string,
  moduleNameOrPath: string
): string | undefined {
  const pathToModule = path.resolve(moduleNameOrPath);
  if (pathExistsSync(pathToModule)) {
    return pathToModule;
  }

  const relativeToModules = path.resolve(modulesDirectory, moduleNameOrPath);
  if (pathExistsSync(relativeToModules)) {
    return relativeToModules;
  }

  const relativeToModulesWithJsExtension = path.resolve(
    modulesDirectory,
    `${moduleNameOrPath}.js`
  );
  if (pathExistsSync(relativeToModulesWithJsExtension)) {
    return relativeToModulesWithJsExtension;
  }

  const relativeToModulesWithTsExtension = path.resolve(
    modulesDirectory,
    `${moduleNameOrPath}.ts`
  );

  if (pathExistsSync(relativeToModulesWithTsExtension)) {
    return relativeToModulesWithTsExtension;
  }

  return undefined;
}

function isInModuleDirectory(modulesDirectory: string, modulePath: string) {
  const resolvedModulesDirectory = path.resolve(modulesDirectory);
  const moduleRelativeToModuleDir = path.relative(
    resolvedModulesDirectory,
    modulePath
  );

  return (
    !moduleRelativeToModuleDir.startsWith("..") &&
    !path.isAbsolute(moduleRelativeToModuleDir)
  );
}
