import setupDebug from "debug";
import { BigNumber } from "ethers";

import { Deployment } from "deployment/Deployment";
import { execute } from "execution/execute";
import { loadJournalInto } from "execution/loadJournalInto";
import { hashExecutionGraph } from "execution/utils";
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
import { IgnitionError } from "utils/errors";
import { isDependable } from "utils/guards";
import { resolveProxyValue } from "utils/proxy";
import { serializeFutureOutput } from "utils/serialize";
import { validateDeploymentGraph } from "validation/validateDeploymentGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  txPollingInterval: number;
  networkName: string;
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
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

    try {
      const chainId = await this._services.network.getChainId();
      await deployment.setChainId(chainId);
      await deployment.setNetworkName(options.networkName);

      const { result: constructResult, moduleOutputs } =
        await this._constructExecutionGraphFrom(deployment, ignitionModule);

      if (constructResult._kind === "failure") {
        log("Failed to construct execution graph");
        return [constructResult, {}];
      }

      log("Execution graph constructed");
      await deployment.transformComplete(constructResult.executionGraph);

      // rebuild previous execution state based on journal
      log("Load journal entries for network");
      await loadJournalInto(deployment, this._journal);

      // check that safe to run based on changes
      log("Reconciling previous runs with current module");
      const moduleChangeResult = this._checkSafeDeployment(deployment);

      if (moduleChangeResult?._kind === "failure") {
        log("Failed to reconcile");
        await deployment.failReconciliation();

        return [moduleChangeResult, {}];
      }

      log("Execute based on execution graph");
      const executionResult = await execute(deployment, {
        maxRetries: options.maxRetries,
        gasPriceIncrementPerRetry: options.gasPriceIncrementPerRetry,
        pollingInterval: options.pollingInterval,
        eventDuration: options.eventDuration,
      });

      return this._buildOutputFrom(executionResult, moduleOutputs);
    } catch (err) {
      if (!(err instanceof Error)) {
        const unexpectedError = new IgnitionError("Unexpected error");

        await deployment.failUnexpected([unexpectedError]);
        return [
          {
            _kind: "failure",
            failures: ["Unexpected error", [unexpectedError]],
          },
          {},
        ];
      }

      await deployment.failUnexpected([err]);
      return [
        {
          _kind: "failure",
          failures: ["Unexpected error", [err]],
        },
        {},
      ];
    }
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

    if (transformResult._kind === "failure") {
      await deployment.failUnexpected(transformResult.failures[1]);

      return { result: transformResult, moduleOutputs };
    }

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

  private _checkSafeDeployment(
    deployment: Deployment
  ): DeploymentResult | { _kind: "success" } {
    if (deployment.state.transform.executionGraph === null) {
      throw new IgnitionError(
        "Execution graph must be set to check safe deployment"
      );
    }

    const previousExecutionGraphHash =
      deployment.state.execution.executionGraphHash;

    if (previousExecutionGraphHash === "") {
      return { _kind: "success" };
    }

    const currentExecutionGraphHash = hashExecutionGraph(
      deployment.state.transform.executionGraph
    );

    if (previousExecutionGraphHash === currentExecutionGraphHash) {
      return { _kind: "success" };
    }

    return {
      _kind: "failure",
      failures: [
        "module change failure",
        [
          new Error(
            "The module has been modified since the last run. Delete the journal file to start again."
          ),
        ],
      ],
    };
  }
}
