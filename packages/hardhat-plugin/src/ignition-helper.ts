import {
  Adapters,
  deploy,
  DeployConfig,
  DeploymentResultSuccess,
  IgnitionError,
  IgnitionModuleDefinition,
  IgnitionModuleResult,
  ModuleParameters,
} from "@ignored/ignition-core";
import { Contract } from "ethers";
import fs from "fs-extra";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { buildAdaptersFrom } from "./buildAdaptersFrom";
import { HardhatArtifactResolver } from "./hardhat-artifact-resolver.ts";

export class IgnitionHelper {
  private _adapters: Adapters;
  private _deploymentDir: string | undefined;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    adapters?: Adapters,
    deploymentDir?: string
  ) {
    this._adapters = adapters ?? buildAdaptersFrom(this._hre);
    this._deploymentDir = deploymentDir;
  }

  public async deploy(
    ignitionModuleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >,
    { parameters = {} }: { parameters: { [key: string]: ModuleParameters } }
  ): Promise<Record<string, Contract>> {
    const accounts = (await this._hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this._hre);

    const result = await deploy({
      config: this._config,
      adapters: this._adapters,
      deploymentDir: this._deploymentDir,
      artifactResolver,
      moduleDefinition: ignitionModuleDefinition,
      deploymentParameters: parameters,
      accounts,
      verbose: false,
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

      const { storedArtifactPath, contractAddress } = deployedContract;

      const abi: any[] = await this._resolveAbiFromArtifactPath(
        storedArtifactPath
      );

      resolvedOutput[key] = await this._hre.ethers.getContractAt(
        abi,
        contractAddress
      );
    }

    return resolvedOutput;
  }

  private async _resolveAbiFromArtifactPath(
    storedArtifactPath: any
  ): Promise<any[]> {
    const artifact = JSON.parse(
      (
        await fs.readFile(
          this._deploymentDir !== undefined
            ? path.join(this._deploymentDir, storedArtifactPath)
            : storedArtifactPath
        )
      ).toString()
    );

    return artifact.abi;
  }
}
