import {
  deploy,
  DeployConfig,
  DeploymentResultSuccess,
  EIP1193Provider,
  IgnitionError,
  IgnitionModule,
  ModuleParameters,
} from "@ignored/ignition-core";
import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { HardhatArtifactResolver } from "./hardhat-artifact-resolver.ts";

export class IgnitionHelper {
  private _provider: EIP1193Provider;
  private _deploymentDir: string | undefined;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    provider?: EIP1193Provider,
    deploymentDir?: string
  ) {
    this._provider = provider ?? this._hre.network.provider;
    this._deploymentDir = deploymentDir;
  }

  public async deploy(
    ignitionModuleDefinition: IgnitionModule,
    {
      parameters = {},
      config: perDeployConfig,
    }: {
      parameters: { [key: string]: ModuleParameters };
      config: Partial<DeployConfig>;
    } = {
      parameters: {},
      config: {},
    }
  ): Promise<Record<string, Contract>> {
    const accounts = (await this._hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this._hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this._config,
      ...perDeployConfig,
    };

    const result = await deploy({
      config: resolvedConfig,
      provider: this._provider,
      deploymentDir: this._deploymentDir,
      artifactResolver,
      ignitionModule: ignitionModuleDefinition,
      deploymentParameters: parameters,
      accounts,
    });

    if (result.status === "timeout") {
      throw new IgnitionError(
        `The deployment has been halted due to transaction timeouts:\n  ${result.timeouts
          .map((t) => `${t.txHash} (${t.futureId}/${t.executionId})`)
          .join("\n  ")}`
      );
    }

    if (result.status !== "success") {
      // TODO: Show more information about why it failed
      throw new IgnitionError("Failed deployment");
    }

    return this._toEthersContracts(result);
  }

  private async _toEthersContracts(
    result: DeploymentResultSuccess
  ): Promise<Record<string, Contract>> {
    const resolvedOutput: { [k: string]: Contract } = {};

    for (const [key, future] of Object.entries(result.module.results)) {
      const deployedContract = result.contracts[future.id];

      if (deployedContract === undefined) {
        throw new IgnitionError(
          `Contract not among deployed results ${future.id}`
        );
      }

      const { contractAddress, artifact } = deployedContract;

      const abi: any[] = artifact.abi;

      resolvedOutput[key] = await this._hre.ethers.getContractAt(
        abi,
        contractAddress
      );
    }

    return resolvedOutput;
  }
}
