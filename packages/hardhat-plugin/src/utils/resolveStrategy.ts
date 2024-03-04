import type {
  DeploymentStrategyType,
  StrategyConfig,
} from "@nomicfoundation/ignition-core";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

export function resolveStrategy(
  strategyName: string = "basic",
  hre: HardhatRuntimeEnvironment,
  strategyConfigOverride: StrategyConfig[keyof StrategyConfig] = {}
): DeploymentStrategyType {
  const { BasicStrategy, Create2Strategy } =
    require("@nomicfoundation/ignition-core") as typeof import("@nomicfoundation/ignition-core");

  const { NomicLabsHardhatPluginError } =
    require("hardhat/plugins") as typeof import("hardhat/plugins");

  switch (strategyName) {
    case "basic":
      return new BasicStrategy();
    case "create2":
      const create2Config = {
        ...hre.config.ignition.strategyConfig?.create2,
        ...strategyConfigOverride,
      };

      if (typeof create2Config.salt !== "string") {
        throw new NomicLabsHardhatPluginError(
          "hardhat-ignition",
          "The create2 strategy requires a salt to be set under 'ignition.strategyConfig.create2.salt' in the Hardhat config"
        );
      }

      return new Create2Strategy({ salt: create2Config.salt });
    default:
      throw new NomicLabsHardhatPluginError(
        "hardhat-ignition",
        "Invalid strategy name, must be either 'basic' or 'create2'"
      );
  }
}
