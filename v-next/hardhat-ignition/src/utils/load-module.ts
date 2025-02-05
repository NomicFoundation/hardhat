import {
  IgnitionError,
  IgnitionModule,
} from "@ignored/hardhat-vnext-ignition-core";
import setupDebug from "debug";
import { pathExistsSync } from "fs-extra";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import path from "path";

import { shouldBeHardhatPluginError } from "./shouldBeHardhatPluginError.js";

const debug = setupDebug("hardhat-ignition:modules");

const MODULES_FOLDER = "modules";

export function loadModule(
  ignitionDirectory: string,
  modulePath: string,
): IgnitionModule | undefined {
  const fullModulesDirectoryName = path.resolve(
    ignitionDirectory,
    MODULES_FOLDER,
  );

  const shortModulesDirectoryName = path.join(
    ignitionDirectory,
    MODULES_FOLDER,
  );

  debug(`Loading user modules from '${fullModulesDirectoryName}'`);

  const fullpathToModule = path.resolve(modulePath);

  if (!pathExistsSync(fullpathToModule)) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.MODULE_NOT_FOUND_AT_PATH,
      {
        modulePath,
      },
    );
  }

  if (!isInModuleDirectory(fullModulesDirectoryName, fullpathToModule)) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.MODULE_OUTSIDE_MODULE_DIRECTORY,
      {
        modulePath,
        shortModulesDirectoryName,
      },
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
       * wrapping the error in a HardhatError.
       */
      if (e.errorNumber === 702) {
        console.error(e);

        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.MODULE_VALIDATION_FAILED,
          e,
        );
      }

      if (shouldBeHardhatPluginError(e)) {
        throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
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
    modulePath,
  );

  return (
    !moduleRelativeToModuleDir.startsWith("..") &&
    !path.isAbsolute(moduleRelativeToModuleDir)
  );
}
