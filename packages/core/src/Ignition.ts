import setupDebug from "debug";
import { BigNumber } from "ethers";

import { Deployment } from "deployment/Deployment";
import { execute } from "execution/execute";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "process/transformDeploymentGraphToExecutionGraph";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import { DeploymentResult, UiParamsClosure } from "types/deployment";
import { DependableFuture, FutureDict } from "types/future";
import { ResultsAccumulator } from "types/graph";
import { Module, ModuleDict } from "types/module";
import { IgnitionPlan } from "types/plan";
import { Providers } from "types/providers";
import { SerializedFutureResult } from "types/serialization";
import { isDependable } from "utils/guards";
import { resolveProxyValue } from "utils/proxy";
import { serializeFutureOutput } from "utils/serialize";
import { validateDeploymentGraph } from "validation/validateDeploymentGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  pathToJournal: string | undefined;
  txPollingInterval: number;
  ui: boolean;
  networkName: string;
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  awaitEventDuration: number;
}

type ModuleOutputs = Record<string, any>;

export class Ignition {
  constructor(
    private _providers: Providers,
    private _uiRenderer: UiParamsClosure
  ) {}

  public async deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    options: IgnitionDeployOptions
  ): Promise<[DeploymentResult, ModuleOutputs]> {
    log(`Start deploy`);

    const deployment = new Deployment(
      ignitionModule.name,
      Deployment.setupServices(options, this._providers),
      options.ui
        ? this._uiRenderer(this._providers.config.parameters)
        : undefined
    );

    const chainId = await this._getChainId();
    deployment.setChainId(chainId);
    deployment.setNetworkName(options.networkName);

    const { result: constructResult, moduleOutputs } =
      await this._constructExecutionGraphFrom(deployment, ignitionModule);

    if (constructResult._kind === "failure") {
      return [constructResult, {}];
    }

    deployment.transformComplete(constructResult.executionGraph);

    log("Execute based on execution graph");
    const executionResult = await execute(deployment, {
      maxRetries: options.maxRetries,
      gasIncrementPerRetry: options.gasIncrementPerRetry,
      pollingInterval: options.pollingInterval,
      awaitEventDuration: options.awaitEventDuration,
    });

    if (executionResult._kind === "failure") {
      return [executionResult, {}];
    }

    const serializedDeploymentResult = this._serialize(
      moduleOutputs,
      executionResult.result
    );

    return [{ _kind: "success", result: serializedDeploymentResult }, {}];
  }

  public async plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan> {
    log(`Start plan`);

    const serviceOptions = {
      providers: this._providers,
      journal: new InMemoryJournal(),
    };

    const services: Services = createServices(
      "moduleIdEXECUTE",
      "executorIdEXECUTE",
      serviceOptions
    );

    const chainId = await this._getChainId();

    const { graph: deploymentGraph } = generateDeploymentGraphFrom(
      deploymentModule,
      {
        chainId,
      }
    );

    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      services
    );

    if (validationResult._kind === "failure") {
      throw new Error(validationResult.failures[0]);
    }

    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      services
    );

    if (transformResult._kind === "failure") {
      throw new Error(transformResult.failures[0]);
    }

    const { executionGraph } = transformResult;

    return { deploymentGraph, executionGraph };
  }

  private async _constructExecutionGraphFrom<T extends ModuleDict>(
    deployment: Deployment,
    ignitionModule: Module<T>
  ): Promise<{ result: any; moduleOutputs: FutureDict }> {
    log("Generate deployment graph from module");
    const { graph: deploymentGraph, moduleOutputs } =
      generateDeploymentGraphFrom(ignitionModule, {
        chainId: deployment.state.details.chainId,
      });

    deployment.startValidation();
    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      deployment.services
    );

    if (validationResult._kind === "failure") {
      deployment.failValidation(validationResult.failures[1]);

      return { result: validationResult, moduleOutputs };
    }

    log("Transform deployment graph to execution graph");
    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      deployment.services
    );

    return { result: transformResult, moduleOutputs };
  }

  private async _getChainId(): Promise<number> {
    const result = await this._providers.ethereumProvider.request({
      method: "eth_chainId",
    });

    return Number(result);
  }

  private _serialize(moduleOutputs: FutureDict, result: ResultsAccumulator) {
    const entries = Object.entries(moduleOutputs).filter(
      (entry): entry is [string, DependableFuture] => isDependable(entry[1])
    );

    const convertedEntries: Array<[string, SerializedFutureResult]> = entries
      .map(([name, givenFuture]): [string, SerializedFutureResult] | null => {
        const future = resolveProxyValue(givenFuture);

        const executionResultValue = result.get(future.vertexId);

        if (
          executionResultValue === undefined ||
          executionResultValue === null ||
          executionResultValue._kind === "failure"
        ) {
          return null;
        }

        const serializedOutput: SerializedFutureResult = serializeFutureOutput(
          executionResultValue.result
        );

        return [name, serializedOutput];
      })
      .filter((x): x is [string, SerializedFutureResult] => x !== null);

    return Object.fromEntries(convertedEntries);
  }
}
