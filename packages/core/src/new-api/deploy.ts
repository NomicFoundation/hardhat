import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ChainDispatcherImpl } from "./internal/execution/chain-dispatcher";
import { buildAdaptersFrom } from "./internal/utils/build-adapters-from";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
} from "./types/deployer";
import { IgnitionModuleResult } from "./types/module";
import { IgnitionModuleDefinition } from "./types/module-builder";
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

async function checkAutominedNetwork(
  provider: EIP1193Provider
): Promise<boolean> {
  const isHardhat = Boolean(
    await provider.request({ method: "hardhat_getAutomine" })
  );

  if (isHardhat) {
    return true;
  }

  const isGanache = /ganache/i.test(
    (await provider.request({ method: "web3_clientVersion" })) as string
  );

  if (isGanache) {
    return true;
  }

  return false;
}
