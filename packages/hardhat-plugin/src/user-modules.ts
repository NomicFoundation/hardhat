import { UserModule } from "@nomicfoundation/ignition-core";
import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

export function loadAllUserModules(
  userModulesDirectory: string
): Array<UserModule<any>> {
  debug(`Loading all user modules from '${userModulesDirectory}'`);

  if (!fsExtra.existsSync(userModulesDirectory)) {
    throw new Error(`Directory ${userModulesDirectory} not found.`);
  }

  const resolvedUserModulesPaths = getAllUserModulesPaths(userModulesDirectory);

  return getUserModulesFromPaths(resolvedUserModulesPaths);
}

export function loadUserModules(
  userModulesDirectory: string,
  userModulesFiles: string[] = []
): Array<UserModule<any>> {
  debug(`Loading user modules from '${userModulesDirectory}'`);

  if (!fsExtra.existsSync(userModulesDirectory)) {
    throw new Error(`Directory ${userModulesDirectory} not found.`);
  }

  const resolvedUserModulesPaths = getUserModulesPaths(
    userModulesDirectory,
    userModulesFiles
  );

  return getUserModulesFromPaths(resolvedUserModulesPaths);
}

export function getUserModulesFromPaths(
  resolvedUserModulesPaths: string[]
): Array<UserModule<any>> {
  debug(`Loading '${resolvedUserModulesPaths.length}' module files`);

  const userModules: any[] = [];
  for (const pathToFile of resolvedUserModulesPaths) {
    const fileExists = fsExtra.pathExistsSync(pathToFile);
    if (!fileExists) {
      throw new Error(`Module ${pathToFile} doesn't exist`);
    }

    debug(`Loading module file '${pathToFile}'`);

    const userModule = require(pathToFile);
    userModules.push(userModule.default ?? userModule);
  }

  return userModules;
}

export function getUserModulesPaths(
  userModulesDirectory: string,
  userModulesFiles: string[]
): string[] {
  return userModulesFiles.map((x) => path.resolve(userModulesDirectory, x));
}

export function getAllUserModulesPaths(userModulesDirectory: string) {
  return fsExtra
    .readdirSync(userModulesDirectory)
    .filter((x) => !x.startsWith("."))
    .map((x) => path.resolve(userModulesDirectory, x));
}
