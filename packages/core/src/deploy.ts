import { IgnitionError } from "./errors";
import {
  DEFAULT_AUTOMINE_REQUIRED_CONFIRMATIONS,
  defaultConfig,
} from "./internal/defaultConfig";
import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { DeploymentLoader } from "./internal/deployment-loader/types";
import { ERRORS } from "./internal/errors-list";
import { BasicExecutionStrategy } from "./internal/execution/basic-execution-strategy";
import { Create2ExecutionStrategy } from "./internal/execution/create2-execution-strategy";
import { EIP1193JsonRpcClient } from "./internal/execution/jsonrpc-client";
import { equalAddresses } from "./internal/execution/utils/address";
import { getDefaultSender } from "./internal/execution/utils/get-default-sender";
import { checkAutominedNetwork } from "./internal/utils/check-automined-network";
import { validate } from "./internal/validation/validate";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
  DeploymentStrategyType,
} from "./types/deploy";
import {
  ExecutionEventListener,
  ExecutionEventType,
} from "./types/execution-events";
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
  defaultSender: givenDefaultSender,
  strategy = DeploymentStrategyType.BASIC,
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
  strategy?: DeploymentStrategyType;
}): Promise<DeploymentResult> {
  if (executionEventListener !== undefined) {
    executionEventListener.setModuleId({
      type: ExecutionEventType.SET_MODULE_ID,
      moduleName: ignitionModule.id,
    });

    executionEventListener.setStrategy({
      type: ExecutionEventType.SET_STRATEGY,
      strategy,
    });
  }

  const validationResult = await validate(
    ignitionModule,
    artifactResolver,
    deploymentParameters,
    accounts
  );

  if (validationResult !== null) {
    if (executionEventListener !== undefined) {
      executionEventListener.deploymentComplete({
        type: ExecutionEventType.DEPLOYMENT_COMPLETE,
        result: validationResult,
      });
    }

    return validationResult;
  }

  const defaultSender = _resolveDefaultSender(givenDefaultSender, accounts);

  const deploymentLoader: DeploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, executionEventListener)
      : new FileDeploymentLoader(deploymentDir, executionEventListener);

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  const executionStrategy = setupStrategy(strategy, deploymentLoader, provider);

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
    deploymentDir,
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

function _resolveDefaultSender(
  givenDefaultSender: string | undefined,
  accounts: string[]
): string {
  let defaultSender: string;
  if (givenDefaultSender !== undefined) {
    const isDefaultSenderInAccounts = accounts.some((account) =>
      equalAddresses(account, givenDefaultSender)
    );

    if (!isDefaultSenderInAccounts) {
      throw new IgnitionError(ERRORS.VALIDATION.INVALID_DEFAULT_SENDER, {
        defaultSender: givenDefaultSender,
      });
    }

    defaultSender = givenDefaultSender;
  } else {
    defaultSender = getDefaultSender(accounts);
  }

  return defaultSender;
}

function setupStrategy(
  strategyName: DeploymentStrategyType,
  deploymentLoader: DeploymentLoader,
  provider: EIP1193Provider
) {
  switch (strategyName) {
    case DeploymentStrategyType.BASIC:
      return new BasicExecutionStrategy((artifactId) =>
        deploymentLoader.loadArtifact(artifactId)
      );
    case DeploymentStrategyType.CREATE2:
      return new Create2ExecutionStrategy(provider, (artifactId) =>
        deploymentLoader.loadArtifact(artifactId)
      );
  }
}
