import { DeploymentBuilder } from "dsl/DeploymentBuilder";
import type {
  CallPoints,
  DeploymentBuilderOptions,
  IDeploymentGraph,
} from "types/deploymentGraph";
import { Module, ModuleDict } from "types/module";
import { IgnitionError } from "utils/errors";
import { assertModuleReturnTypes } from "utils/guards";

export function generateDeploymentGraphFrom<T extends ModuleDict>(
  ignitionModule: Module<T>,
  builderOptions: DeploymentBuilderOptions
): { graph: IDeploymentGraph; callPoints: CallPoints; moduleOutputs: T } {
  const graphBuilder = new DeploymentBuilder(builderOptions);

  const moduleOutputs = ignitionModule.action(graphBuilder);

  if (isPromise(moduleOutputs)) {
    throw new IgnitionError(
      `The callback passed to 'buildModule' for ${ignitionModule.name} returns a Promise; async callbacks are not allowed in 'buildModule'.`
    );
  }

  assertModuleReturnTypes(moduleOutputs);

  return {
    graph: graphBuilder.graph,
    callPoints: graphBuilder.callPoints,
    moduleOutputs,
  };
}

function isPromise(promise: any) {
  return (
    promise &&
    typeof promise.then === "function" &&
    promise[Symbol.toStringTag] === "Promise"
  );
}
