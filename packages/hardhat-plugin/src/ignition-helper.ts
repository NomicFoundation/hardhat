import {
  Deployer,
  DeploymentResultSuccess,
  IgnitionError,
  IgnitionModuleDefinition,
  IgnitionModuleResult,
  MemoryJournal,
  ModuleParameters,
} from "@ignored/ignition-core";
import { Contract } from "ethers";
import fs from "fs-extra";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { buildAdaptersFrom } from "./buildAdaptersFrom";
import { buildArtifactResolverFrom } from "./buildArtifactResolverFrom";
import { buildDeploymentLoader } from "./buildDeploymentLoader";

export class IgnitionHelper {
  constructor(private _hre: HardhatRuntimeEnvironment) {}

  public async deploy(
    ignitionModuleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >,
    { parameters = {} }: { parameters: { [key: string]: ModuleParameters } }
  ): Promise<any> {
    const accounts = (await this._hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const deployer = new Deployer({
      journal: new MemoryJournal(),
      adapters: buildAdaptersFrom(this._hre),
      artifactResolver: buildArtifactResolverFrom(this._hre),
      deploymentLoader: buildDeploymentLoader(this._hre),
    });

    const result = await deployer.deploy(
      "deploy-01",
      ignitionModuleDefinition,
      parameters,
      accounts
    );

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
      (await fs.readFile(storedArtifactPath)).toString()
    );

    return artifact.abi;
  }
}
