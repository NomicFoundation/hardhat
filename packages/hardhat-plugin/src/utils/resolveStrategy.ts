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
      const salt =
        "salt" in strategyConfigOverride
          ? strategyConfigOverride.salt
          : hre.config.ignition.strategyConfig?.create2?.salt ??
            "default-ignition-salt";

      return new Create2Strategy(hre.network.provider, { salt });
    default:
      throw new NomicLabsHardhatPluginError(
        "hardhat-ignition",
        "Invalid strategy name, must be either 'basic' or 'create2'"
      );
  }
}
