import { UserModule } from "@nomiclabs/ignition-core";
import setupDebug from "debug";
import fsExtra from "fs-extra";
import path from "path";

const debug = setupDebug("hardhat-ignition:modules");

export async function loadUserModules(
  userModulesDirectory: string,
  userModulesFiles: string[]
): Promise<Array<UserModule<any>>> {
  debug(`Loading user modules from '${userModulesDirectory}'`);

  let resolvedUserModulesPaths: string[];
  if (userModulesFiles.length === 0) {
    debug("No files passed, reading all module files");

    resolvedUserModulesPaths = getAllUserModules(userModulesDirectory);
  } else {
    debug(`Reading '${userModulesFiles.length}' selected module files`);
    resolvedUserModulesPaths = userModulesFiles.map((x) =>
      path.resolve(process.cwd(), x)
    );
  }

  debug(`Loading '${resolvedUserModulesPaths.length}' module files`);
  const userModules: any[] = [];
  for (const ignitionFile of resolvedUserModulesPaths) {
    const pathToFile = path.resolve(userModulesDirectory, ignitionFile);

    const fileExists = await fsExtra.pathExists(pathToFile);
    if (!fileExists) {
      throw new Error(`Module ${pathToFile} doesn't exist`);
    }

    debug(`Loading module file '${pathToFile}'`);

    const userModule = require(pathToFile);
    userModules.push(userModule.default ?? userModule);
  }

  return userModules;
}

export function getAllUserModules(userModulesDirectory: string) {
  return fsExtra
    .readdirSync(userModulesDirectory)
    .filter((x) => !x.startsWith("."));
}
