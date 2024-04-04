import path from "path";
import { fileURLToPath } from "url";
// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename); // get the name of the directory

import { resetHardhatContext } from "hardhat/plugins-testing.js";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(fixtureProjectName: string) {
  beforeEach("Loading hardhat environment", async function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));

    this.env = (await import("hardhat")).default;
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}
