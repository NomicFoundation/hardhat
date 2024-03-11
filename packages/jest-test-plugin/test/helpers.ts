import { resetHardhatContext } from "hardhat/plugins-testing"; // TODO: what to do?
import path from "path";

export function useEnvironment(fixtureProjectName: string) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}
