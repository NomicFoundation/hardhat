import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import path from "path";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(
  fixtureProjectName: string,
  networkName = "localhost"
) {
  beforeEach("Loading hardhat environment", async function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
    await this.env.run(TASK_COMPILE);
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}
