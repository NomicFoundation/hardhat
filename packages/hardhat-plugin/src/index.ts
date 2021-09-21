import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import path from "path";

import { IgnitionWrapper } from "./ignition-wrapper";
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const userIgnitionPath = userConfig.paths?.ignition;

    let ignitionPath: string;
    if (userIgnitionPath === undefined) {
      ignitionPath = path.join(config.paths.root, "ignition");
    } else {
      if (path.isAbsolute(userIgnitionPath)) {
        ignitionPath = userIgnitionPath;
      } else {
        ignitionPath = path.normalize(
          path.join(config.paths.root, userIgnitionPath)
        );
      }
    }

    config.paths.ignition = ignitionPath;
  }
);

extendEnvironment((hre) => {
  hre.ignition = lazyObject(() => new IgnitionWrapper());
});

task("deploy", async (_, hre) => {
  console.log(hre.config.paths.ignition);
});
