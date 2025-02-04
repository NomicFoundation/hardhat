import {
  IgnitionError,
  IgnitionModule,
} from "@ignored/hardhat-vnext-ignition-core";
import setupDebug from "debug";
import { pathExistsSync } from "fs-extra";
import {
  HardhatPluginError,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import path from "path";

import { shouldBeHardhatPluginError } from "./shouldBeHardhatPluginError.js";

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

  let module;
  try {
    module = require(fullpathToModule);
  } catch (e) {
    if (e instanceof IgnitionError) {
      /**
       * Errors thrown from within ModuleBuilder use this errorNumber.
       *
       * They have a stack trace that's useful to the user, so we display it here, instead of
       * wrapping the error in a NomicLabsHardhatPluginError.
       */
      if (e.errorNumber === 702) {
        console.error(e);

        throw new NomicLabsHardhatPluginError(
          "hardhat-ignition",
          "Module validation failed. Check the stack trace above to identify the issue and its source code location."
        );
      }

      if (shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }
    }

    throw e;
  }

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
