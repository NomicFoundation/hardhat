import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

export function useIgnitionProject(fixtureProjectName: string) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.run("compile", { quiet: true });

    this.hre = hre;
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });
}
