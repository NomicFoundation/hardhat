import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { BasicExecutionStrategy } from "./internal/new-execution/basic-execution-strategy";
import { EIP1193JsonRpcClient } from "./internal/new-execution/jsonrpc-client";
import { getFallbackSender } from "./internal/new-execution/utils/get-fallback-sender";
import { checkAutominedNetwork } from "./internal/utils/check-automined-network";
import { validateStageOne } from "./internal/validation/validateStageOne";
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
  ignitionModule,
  deploymentParameters,
  accounts,
  verbose,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  provider: EIP1193Provider;
  deploymentDir?: string;
  ignitionModule: IgnitionModule;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  verbose: boolean;
}): Promise<DeploymentResult> {
  await validateStageOne(ignitionModule, artifactResolver);

  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, verbose)
      : new FileDeploymentLoader(deploymentDir, verbose);

  const executionStrategy = new BasicExecutionStrategy(
    getFallbackSender(accounts),
    (artifactId) => deploymentLoader.loadArtifact(artifactId)
  );

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  // TODO: resolve config here
  const isAutominedNetwork = await checkAutominedNetwork(provider);

  const deployer = new Deployer(
    config as any,
    executionStrategy,
    jsonRpcClient,
    artifactResolver,
    deploymentLoader
  );

  return deployer.deploy(ignitionModule, deploymentParameters, accounts);
}
