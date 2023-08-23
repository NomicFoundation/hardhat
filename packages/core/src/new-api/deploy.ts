import { IgnitionValidationError } from "../errors";

import {
  DEFAULT_AUTOMINE_REQUIRED_CONFIRMATIONS,
  defaultConfig,
} from "./internal/defaultConfig";
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
  fallbackSender,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  provider: EIP1193Provider;
  deploymentDir?: string;
  ignitionModule: IgnitionModule;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  verbose: boolean;
  fallbackSender?: string;
}): Promise<DeploymentResult> {
  await validateStageOne(ignitionModule, artifactResolver);

  if (fallbackSender !== undefined) {
    if (!accounts.includes(fallbackSender)) {
      throw new IgnitionValidationError(
        `Default sender ${fallbackSender} is not part of the provided accounts`
      );
    }
  } else {
    fallbackSender = getFallbackSender(accounts);
  }

  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, verbose)
      : new FileDeploymentLoader(deploymentDir, verbose);

  const executionStrategy = new BasicExecutionStrategy((artifactId) =>
    deploymentLoader.loadArtifact(artifactId)
  );

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  const isAutominedNetwork = await checkAutominedNetwork(provider);

  const resolvedConfig: DeployConfig = {
    ...defaultConfig,
    ...config,
    requiredConfirmations: isAutominedNetwork
      ? DEFAULT_AUTOMINE_REQUIRED_CONFIRMATIONS
      : config.requiredConfirmations ?? defaultConfig.requiredConfirmations,
  };

  const deployer = new Deployer(
    resolvedConfig,
    executionStrategy,
    jsonRpcClient,
    artifactResolver,
    deploymentLoader
  );

  return deployer.deploy(
    ignitionModule,
    deploymentParameters,
    accounts,
    fallbackSender
  );
}
