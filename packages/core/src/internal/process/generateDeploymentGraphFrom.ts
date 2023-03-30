import type {
  CallPoints,
  DeploymentBuilderOptions,
  IDeploymentGraph,
} from "../types/deploymentGraph";

import { IgnitionError } from "../../errors";
import { Module, ModuleDict } from "../../types/module";
import { ProcessStepResult } from "../../types/process";
import { DeploymentBuilder } from "../dsl/DeploymentBuilder";
import { assertModuleReturnTypes } from "../utils/guards";
import {
  processStepErrored,
  processStepSucceeded,
} from "../utils/process-results";

export function generateDeploymentGraphFrom<T extends ModuleDict>(
  ignitionModule: Module<T>,
  builderOptions: DeploymentBuilderOptions
): ProcessStepResult<{
  graph: IDeploymentGraph;
  callPoints: CallPoints;
  moduleOutputs: T;
}> {
  try {
    const graphBuilder = new DeploymentBuilder(builderOptions);

    const moduleOutputs = ignitionModule.action(graphBuilder);

    if (moduleOutputs instanceof Promise) {
      throw new IgnitionError(
        `The callback passed to 'buildModule' for ${ignitionModule.name} returns a Promise; async callbacks are not allowed in 'buildModule'.`
      );
    }

    assertModuleReturnTypes(moduleOutputs);

    return processStepSucceeded({
      graph: graphBuilder.graph,
      callPoints: graphBuilder.callPoints,
      moduleOutputs,
    });
  } catch (error) {
    return processStepErrored(error, "Deployment graph construction failed");
  }
}
