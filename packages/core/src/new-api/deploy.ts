import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ChainDispatcherImpl } from "./internal/execution/chain-dispatcher";
import { buildAdaptersFrom } from "./internal/utils/build-adapters-from";
import { checkAutominedNetwork } from "./internal/utils/check-automined-network";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
} from "./types/deployer";
import { IgnitionModule } from "./types/module";
import { EIP1193Provider } from "./types/provider";

/**
 * Deploy an IgnitionModule to the chain
 *
 * @beta
 */
export async function deploy({
  config = {},
  artifactResolver,
  provider,
  deploymentDir,
  moduleDefinition,
  deploymentParameters,
  accounts,
  verbose,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  provider: EIP1193Provider;
  deploymentDir?: string;
  moduleDefinition: IgnitionModule;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  verbose: boolean;
}): Promise<DeploymentResult> {
  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, verbose)
      : new FileDeploymentLoader(deploymentDir, verbose);

  const chainDispatcher = new ChainDispatcherImpl(buildAdaptersFrom(provider));

  const isAutominedNetwork = await checkAutominedNetwork(provider);

  const deployer = new Deployer({
    config,
    artifactResolver,
    deploymentLoader,
    chainDispatcher,
    isAutominedNetwork,
  });

  return deployer.deploy(moduleDefinition, deploymentParameters, accounts);
}
