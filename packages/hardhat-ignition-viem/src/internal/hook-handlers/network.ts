import type {
  IgnitionModuleResultsToViemContracts,
  ViemIgnitionHelper,
} from "../../types.js";
import type { ViemIgnitionHelperImpl } from "../viem-ignition-helper.js";
import type {
  DeployConfig,
  DeploymentParameters,
  IgnitionModule,
  IgnitionModuleResult,
  StrategyConfig,
} from "@nomicfoundation/ignition-core";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { HardhatConfig } from "hardhat/types/config";
import type {
  HookContext,
  HookManager,
  NetworkHooks,
} from "hardhat/types/hooks";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { UserInterruptionManager } from "hardhat/types/user-interruptions";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

class LazyViemIgnitionHelper<ChainTypeT extends ChainType | string>
  implements ViemIgnitionHelper
{
  public type: "viem" = "viem";

  readonly #hardhatConfig: HardhatConfig;
  readonly #artifactsManager: ArtifactManager;
  readonly #connection: NetworkConnection<ChainTypeT>;
  readonly #userInterruptions: UserInterruptionManager;
  readonly #hooks: HookManager;
  readonly #config: Partial<DeployConfig> | undefined;

  #viemIgnitionHelper: ViemIgnitionHelperImpl<ChainTypeT> | undefined;

  constructor(
    hardhatConfig: HardhatConfig,
    artifactsManager: ArtifactManager,
    connection: NetworkConnection<ChainTypeT>,
    userInterruptions: UserInterruptionManager,
    hooks: HookManager,
    config?: Partial<DeployConfig> | undefined,
  ) {
    this.#hardhatConfig = hardhatConfig;
    this.#artifactsManager = artifactsManager;
    this.#connection = connection;
    this.#userInterruptions = userInterruptions;
    this.#hooks = hooks;
    this.#config = config;
  }

  public async deploy<
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
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    const viemIgnitionHelper = await this.#getViemIgnitionHelper();
    return viemIgnitionHelper.deploy(ignitionModule, options);
  }

  public getResolvedConfig(
    perDeployConfig: Partial<DeployConfig>,
  ): Partial<DeployConfig> {
    // Note: This duplicates the logic of the actual implementation because it's
    // a synchronous method, so we can't import the implementation.
    return {
      ...this.#config,
      ...perDeployConfig,
    };
  }

  async #getViemIgnitionHelper(): Promise<ViemIgnitionHelperImpl<ChainTypeT>> {
    if (this.#viemIgnitionHelper === undefined) {
      const { ViemIgnitionHelperImpl } = await import(
        "../viem-ignition-helper.js"
      );

      this.#viemIgnitionHelper = new ViemIgnitionHelperImpl(
        this.#hardhatConfig,
        this.#artifactsManager,
        this.#connection,
        this.#userInterruptions,
        this.#hooks,
        this.#config,
      );
    }

    return this.#viemIgnitionHelper;
  }
}

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ) {
      const connection: NetworkConnection<ChainTypeT> = await next(context);

      if (connection.ignition !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.INTERNAL.ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED,
        );
      }

      connection.ignition = new LazyViemIgnitionHelper<ChainTypeT>(
        context.config,
        context.artifacts,
        connection,
        context.interruptions,
        context.hooks,
        context.config.ignition,
      );

      return connection;
    },
  };

  return handlers;
};
