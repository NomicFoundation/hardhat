import type { IgnitionModuleResultsTToEthersContracts } from "./internal/ethers-ignition-helper.js";
import type {
  IgnitionModuleResult,
  StrategyConfig,
  IgnitionModule,
  DeploymentParameters,
  DeployConfig,
} from "@ignored/hardhat-vnext-ignition-core";

export interface EthersIgnitionHelper {
  type: "ethers";

  deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
    StrategyT extends keyof StrategyConfig = "basic",
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    options?: {
      parameters?: DeploymentParameters | string;
      config?: Partial<DeployConfig>;
      defaultSender?: string;
      strategy?: StrategyT;
      strategyConfig?: StrategyConfig[StrategyT];
      deploymentId?: string;
      displayUi?: boolean;
    },
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  >;
}
