import { IgnitionModule } from "@nomicfoundation/ignition-core";
import setupDebug from "debug";
import { existsSync, pathExistsSync } from "fs-extra";
import { HardhatPluginError } from "hardhat/plugins";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

const MODULES_FOLDER = "modules";

export function loadModule(
  ignitionDirectory: string,
  modulePath: string
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

  const fullpathToModule = path.resolve(modulePath);

  if (!pathExistsSync(fullpathToModule)) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `Could not find a module file at the path: ${modulePath}`
    );
  }

  if (!isInModuleDirectory(fullModulesDirectoryName, fullpathToModule)) {
    throw new HardhatPluginError(
      "hardhat-ignition",
      `The referenced module file ${modulePath} is outside the module directory ${shortModulesDirectoryName}`
    );
  }

  debug(`Loading module file '${fullpathToModule}'`);

  const module = require(fullpathToModule);

  return module.default ?? module;
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
