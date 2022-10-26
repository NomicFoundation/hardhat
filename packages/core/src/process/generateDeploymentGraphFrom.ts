import { DeploymentBuilder } from "dsl/DeploymentBuilder";
import type {
  DeploymentBuilderOptions,
  IDeploymentGraph,
} from "types/deploymentGraph";
import { FutureDict } from "types/future";
import { Module } from "types/module";

export function generateDeploymentGraphFrom(
  ignitionModule: Module,
  builderOptions: DeploymentBuilderOptions
): { graph: IDeploymentGraph; moduleOutputs: FutureDict } {
  const graphBuilder = new DeploymentBuilder(builderOptions);

  const moduleOutputs = ignitionModule.moduleAction(graphBuilder);

  return { graph: graphBuilder.graph, moduleOutputs };
}
