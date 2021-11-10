import debug from "debug";
import fsExtra from "fs-extra";
import { UserModule } from "ignition";
import path from "path";

const log = debug("hardhat-ignition:modules");

export async function loadUserModules(
  ignitionDirectory: string,
  modulesFiles: string[]
): Promise<Array<UserModule<any>>> {
  log(`Loading user modules from '${ignitionDirectory}'`);

  let ignitionFiles: string[];
  if (modulesFiles.length === 0) {
    log("No files passed, reading all module files");

    // load all modules in ignition's directory
    ignitionFiles = fsExtra
      .readdirSync(ignitionDirectory)
      .filter((x) => !x.startsWith("."));
  } else {
    log(`Reading '${modulesFiles.length}' selected module files`);
    ignitionFiles = modulesFiles.map((x) => path.resolve(process.cwd(), x));
  }

  log(`Loading '${ignitionFiles.length}' module files`);
  const userModules: any[] = [];
  for (const ignitionFile of ignitionFiles) {
    const pathToFile = path.resolve(ignitionDirectory, ignitionFile);

    const fileExists = await fsExtra.pathExists(pathToFile);
    if (!fileExists) {
      throw new Error(`Module ${pathToFile} doesn't exist`);
    }

    log(`Loading module file '${pathToFile}'`);
    const userModule = require(pathToFile);
    userModules.push(userModule.default ?? userModule);
  }

  return userModules;
}
