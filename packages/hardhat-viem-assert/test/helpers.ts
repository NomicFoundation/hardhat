import path from "path";
import { fileURLToPath } from "url";
// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename); // get the name of the directory

import { afterEach, beforeEach } from "node:test";

import { resetHardhatContext } from "hardhat/plugins-testing.js";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export function useEnvironment(fixtureProjectName: string): () => any {
  let hre: HardhatRuntimeEnvironment;

  beforeEach(async function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));

    hre = (await import("hardhat")).default;
  });

  afterEach(function () {
    resetHardhatContext();
  });

  return () => hre;
}
