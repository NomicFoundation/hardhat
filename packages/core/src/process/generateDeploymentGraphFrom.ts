import { DeploymentBuilder } from "dsl/DeploymentBuilder";
import type {
  DeploymentBuilderOptions,
  IDeploymentGraph,
} from "types/deploymentGraph";
import { FutureDict } from "types/future";
import { Module, ModuleDict } from "types/module";

export function generateDeploymentGraphFrom<T extends ModuleDict>(
  ignitionModule: Module<T>,
  builderOptions: DeploymentBuilderOptions
): { graph: IDeploymentGraph; moduleOutputs: FutureDict } {
  const graphBuilder = new DeploymentBuilder(builderOptions);

  const moduleOutputs = ignitionModule.action(graphBuilder);

  return { graph: graphBuilder.graph, moduleOutputs };
}
