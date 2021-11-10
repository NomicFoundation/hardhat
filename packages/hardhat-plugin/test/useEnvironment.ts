import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

export function useEnvironment(fixtureProjectName: string) {
  beforeEach("Load environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    this.hre = require("hardhat");
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });
}
