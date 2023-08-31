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
import { getDefaultSender } from "./internal/new-execution/utils/get-default-sender";
import { checkAutominedNetwork } from "./internal/utils/check-automined-network";
import { validateStageOne } from "./internal/validation/validateStageOne";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
} from "./types/deploy";
import { ExecutionEventListener } from "./types/execution-events";
import { IgnitionModule, IgnitionModuleResult } from "./types/module";
import { EIP1193Provider } from "./types/provider";

/**
 * Deploy an IgnitionModule to the chain
 *
 * @beta
 */
export async function deploy<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
>({
  config = {},
  artifactResolver,
  provider,
  executionEventListener,
  deploymentDir,
  ignitionModule,
  deploymentParameters,
  accounts,
  defaultSender,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  provider: EIP1193Provider;
  executionEventListener?: ExecutionEventListener;
  deploymentDir?: string;
  ignitionModule: IgnitionModule<
    ModuleIdT,
    ContractNameT,
    IgnitionModuleResultsT
  >;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  defaultSender?: string;
}): Promise<DeploymentResult<ContractNameT, IgnitionModuleResultsT>> {
  await validateStageOne(ignitionModule, artifactResolver);

  if (defaultSender !== undefined) {
    if (!accounts.includes(defaultSender)) {
      throw new IgnitionValidationError(
        `Default sender ${defaultSender} is not part of the provided accounts`
      );
    }
  } else {
    defaultSender = getDefaultSender(accounts);
  }

  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, executionEventListener)
      : new FileDeploymentLoader(deploymentDir, executionEventListener);

  const executionStrategy = new BasicExecutionStrategy((artifactId) =>
    deploymentLoader.loadArtifact(artifactId)
  );

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  const isAutominedNetwork = await checkAutominedNetwork(provider);

  const resolvedConfig: DeployConfig = {
    ...defaultConfig,
    requiredConfirmations: isAutominedNetwork
      ? DEFAULT_AUTOMINE_REQUIRED_CONFIRMATIONS
      : config.requiredConfirmations ?? defaultConfig.requiredConfirmations,
    ...config,
  };

  const deployer = new Deployer(
    resolvedConfig,
    executionStrategy,
    jsonRpcClient,
    artifactResolver,
    deploymentLoader,
    executionEventListener
  );

  return deployer.deploy(
    ignitionModule,
    deploymentParameters,
    accounts,
    defaultSender
  );
}
