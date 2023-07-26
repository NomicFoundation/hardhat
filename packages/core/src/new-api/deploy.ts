import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ChainDispatcherImpl } from "./internal/execution/chain-dispatcher";
import { Adapters } from "./types/adapters";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
} from "./types/deployer";
import { IgnitionModuleResult } from "./types/module";
import { IgnitionModuleDefinition } from "./types/module-builder";

/**
 * Deploy an IgnitionModule to the chain
 *
 * @beta
 */
export async function deploy({
  config,
  artifactResolver,
  adapters,
  deploymentDir,
  moduleDefinition,
  deploymentParameters,
  accounts,
  verbose,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  adapters: Adapters;
  deploymentDir?: string;
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  verbose: boolean;
}): Promise<DeploymentResult> {
  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, verbose)
      : new FileDeploymentLoader(deploymentDir, verbose);

  const chainDispatcher = new ChainDispatcherImpl(adapters);

  const deployer = new Deployer({
    config: config ?? {},
    artifactResolver,
    deploymentLoader,
    chainDispatcher,
  });

  return deployer.deploy(moduleDefinition, deploymentParameters, accounts);
}
