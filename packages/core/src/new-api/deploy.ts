import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ChainDispatcherImpl } from "./internal/execution/chain-dispatcher";
import { Adapters } from "./types/adapters";
import { ArtifactResolver } from "./types/artifact";
import { DeploymentResult } from "./types/deployer";
import { IgnitionModuleResult, ModuleParameters } from "./types/module";
import { IgnitionModuleDefinition } from "./types/module-builder";

/**
 * Deploy an IgnitionModule to the chain
 *
 * @beta
 */
export async function deploy({
  artifactResolver,
  adapters,
  deploymentDir,
  moduleDefinition,
  deploymentParameters,
  accounts,
}: {
  artifactResolver: ArtifactResolver;
  adapters: Adapters;
  deploymentDir?: string;
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >;
  deploymentParameters: { [key: string]: ModuleParameters };
  accounts: string[];
}): Promise<DeploymentResult> {
  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver)
      : new FileDeploymentLoader(deploymentDir);

  const chainDispatcher = new ChainDispatcherImpl(adapters);

  const deployer = new Deployer({
    artifactResolver,
    deploymentLoader,
    chainDispatcher,
  });

  return deployer.deploy(moduleDefinition, deploymentParameters, accounts);
}
