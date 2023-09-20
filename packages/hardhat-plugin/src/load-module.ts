import { IgnitionModule } from "@nomicfoundation/ignition-core";
import setupDebug from "debug";
import { existsSync, pathExistsSync } from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

export function loadModule(
  modulesDirectory: string,
  moduleNameOrPath: string
): IgnitionModule | undefined {
  debug(`Loading user modules from '${modulesDirectory}'`);

  if (!existsSync(modulesDirectory)) {
    throw new Error(`Directory ${modulesDirectory} not found.`);
  }

  const fullpathToModule = resolveFullPathToModule(
    modulesDirectory,
    moduleNameOrPath
  );

  if (fullpathToModule === undefined) {
    throw new Error(`Could not find module ${moduleNameOrPath}`);
  }

  if (!isInModuleDirectory(modulesDirectory, fullpathToModule)) {
    throw new Error(
      `The referenced module ${moduleNameOrPath} is outside the module directory ${modulesDirectory}`
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
