import setupDebug from "debug";
import { BigNumber } from "ethers";

import { Deployment } from "deployment/Deployment";
import { execute } from "execution/execute";
import { loadJournalInto } from "execution/loadJournalInto";
import { NoopCommandJournal } from "journal/NoopCommandJournal";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "process/transformDeploymentGraphToExecutionGraph";
import { Services } from "services/types";
import { DeploymentResult, UpdateUiAction } from "types/deployment";
import { DependableFuture, FutureDict } from "types/future";
import { ResultsAccumulator, VisitResult } from "types/graph";
import { ICommandJournal } from "types/journal";
import { Module, ModuleDict } from "types/module";
import { IgnitionPlan } from "types/plan";
import { SerializedFutureResult } from "types/serialization";
import { isDependable } from "utils/guards";
import { resolveProxyValue } from "utils/proxy";
import { serializeFutureOutput } from "utils/serialize";
import { validateDeploymentGraph } from "validation/validateDeploymentGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  txPollingInterval: number;
  networkName: string;
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  awaitEventDuration: number;
}

type ModuleOutputs = Record<string, any>;

export class Ignition {
  private _services: Services;
  private _uiRenderer: UpdateUiAction;
  private _journal: ICommandJournal;

  constructor({
    services,
    uiRenderer,
    journal,
  }: {
    services: Services;
    uiRenderer?: UpdateUiAction;
    journal?: ICommandJournal;
  }) {
    this._services = services;
    this._uiRenderer = uiRenderer ?? (() => {});
    this._journal = journal ?? new NoopCommandJournal();
  }

  public async deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    options: IgnitionDeployOptions
  ): Promise<[DeploymentResult, ModuleOutputs]> {
    log(`Start deploy`);

    const deployment = new Deployment(
      ignitionModule.name,
      this._services,
      this._journal,
      this._uiRenderer
    );

    const chainId = await this._services.network.getChainId();
    await deployment.setChainId(chainId);
    await deployment.setNetworkName(options.networkName);

    const { result: constructResult, moduleOutputs } =
      await this._constructExecutionGraphFrom(deployment, ignitionModule);

    if (constructResult._kind === "failure") {
      return [constructResult, {}];
    }

    await deployment.transformComplete(constructResult.executionGraph);

    log("Execute based on execution graph");

    // rebuild previous execution state based on journal
    await loadJournalInto(deployment, this._journal);

    const executionResult = await execute(deployment, {
      maxRetries: options.maxRetries,
      gasIncrementPerRetry: options.gasIncrementPerRetry,
      pollingInterval: options.pollingInterval,
      awaitEventDuration: options.awaitEventDuration,
    });

    return this._buildOutputFrom(executionResult, moduleOutputs);
  }

  public async plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan> {
    log(`Start plan`);

    const chainId = await this._services.network.getChainId();

    const { graph: deploymentGraph } = generateDeploymentGraphFrom(
      deploymentModule,
      {
        chainId,
      }
    );

    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      this._services
    );

    if (validationResult._kind === "failure") {
      throw new Error(validationResult.failures[0]);
    }

    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      this._services
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

    await deployment.startValidation();
    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      deployment.services
    );

    if (validationResult._kind === "failure") {
      await deployment.failValidation(validationResult.failures[1]);

      return { result: validationResult, moduleOutputs };
    }

    log("Transform deployment graph to execution graph");
    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      deployment.services
    );

    return { result: transformResult, moduleOutputs };
  }

  private _buildOutputFrom(
    executionResult: VisitResult,
    moduleOutputs: FutureDict
  ): [DeploymentResult, ModuleOutputs] {
    if (executionResult._kind === "failure") {
      return [executionResult, {}];
    }

    if (executionResult._kind === "hold") {
      return [executionResult, {}];
    }

    const serializedDeploymentResult = this._serialize(
      moduleOutputs,
      executionResult.result
    );

    return [{ _kind: "success", result: serializedDeploymentResult }, {}];
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
          executionResultValue._kind === "failure" ||
          executionResultValue._kind === "hold"
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
