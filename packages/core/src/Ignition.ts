import type {
  DeploymentResult,
  IgnitionDeployOptions,
  UpdateUiAction,
} from "./internal/types/deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVisitResult,
} from "./internal/types/executionGraph";
import type { ICommandJournal } from "./internal/types/journal";
import type { Module, ModuleDict } from "./types/module";
import type { IgnitionPlan } from "./types/plan";
import type {
  ContractInfo,
  SerializedDeploymentResult,
} from "./types/serialization";

import setupDebug from "debug";

import { Deployment } from "./internal/deployment/Deployment";
import { execute } from "./internal/execution/execute";
import { loadJournalInto } from "./internal/execution/loadJournalInto";
import { hashExecutionGraph } from "./internal/execution/utils";
import { NoopCommandJournal } from "./internal/journal/NoopCommandJournal";
import { generateDeploymentGraphFrom } from "./internal/process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "./internal/process/transformDeploymentGraphToExecutionGraph";
import { Services } from "./internal/types/services";
import { IgnitionError } from "./internal/utils/errors";
import { resolveProxyValue } from "./internal/utils/proxy";
import { validateDeploymentGraph } from "./internal/validation/validateDeploymentGraph";

const log = setupDebug("ignition:main");

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
  ): Promise<DeploymentResult<T>> {
    log(`Start deploy`);

    const deployment = new Deployment(
      ignitionModule.name,
      this._services,
      this._journal,
      this._uiRenderer
    );

    try {
      const [chainId, accounts] = await Promise.all([
        this._services.network.getChainId(),
        this._services.accounts.getAccounts(),
      ]);

      await deployment.setDeploymentDetails({
        accounts,
        chainId,
        networkName: options.networkName,
        force: options.force,
      });

      const { result: constructResult, moduleOutputs } =
        await this._constructExecutionGraphFrom(deployment, ignitionModule);

      if (constructResult._kind === "failure") {
        log("Failed to construct execution graph");
        return constructResult;
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

        return moduleChangeResult;
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
        return {
          _kind: "failure",
          failures: ["Unexpected error", [unexpectedError]],
        };
      }

      await deployment.failUnexpected([err]);
      return {
        _kind: "failure",
        failures: ["Unexpected error", [err]],
      };
    }
  }

  public async plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan> {
    log(`Start plan`);

    const [chainId, accounts] = await Promise.all([
      this._services.network.getChainId(),
      this._services.accounts.getAccounts(),
    ]);

    const { graph: deploymentGraph, callPoints } = generateDeploymentGraphFrom(
      deploymentModule,
      {
        chainId,
        accounts,
      }
    );

    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      callPoints,
      this._services
    );

    if (validationResult._kind === "failure") {
      throw new IgnitionError(validationResult.failures[0]);
    }

    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      this._services
    );

    if (transformResult._kind === "failure") {
      throw new IgnitionError(transformResult.failures[0]);
    }

    const { executionGraph } = transformResult;

    return { deploymentGraph, executionGraph };
  }

  private async _constructExecutionGraphFrom<T extends ModuleDict>(
    deployment: Deployment,
    ignitionModule: Module<T>
  ): Promise<{ result: any; moduleOutputs: T }> {
    log("Generate deployment graph from module");
    const {
      graph: deploymentGraph,
      callPoints,
      moduleOutputs,
    } = generateDeploymentGraphFrom(ignitionModule, {
      chainId: deployment.state.details.chainId,
      accounts: deployment.state.details.accounts,
    });

    await deployment.startValidation();
    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      callPoints,
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

  private _buildOutputFrom<T extends ModuleDict>(
    executionResult: ExecutionVisitResult,
    moduleOutputs: T
  ): DeploymentResult<T> {
    if (executionResult._kind === "failure") {
      return executionResult;
    }

    if (executionResult._kind === "hold") {
      return executionResult;
    }

    const serializedDeploymentResult = this._serialize(
      moduleOutputs,
      executionResult.result
    );

    return { _kind: "success", result: serializedDeploymentResult };
  }

  private _serialize<T extends ModuleDict>(
    moduleOutputs: T,
    result: ExecutionResultsAccumulator
  ): SerializedDeploymentResult<T> {
    const entries = Object.entries(moduleOutputs);

    const serializedResult: { [k: string]: ContractInfo } = {};
    for (const [key, value] of entries) {
      const future = resolveProxyValue(value);

      const executionResultValue = result.get(future.vertexId);

      if (
        executionResultValue === undefined ||
        executionResultValue === null ||
        executionResultValue._kind === "failure" ||
        executionResultValue._kind === "hold" ||
        future.type !== "contract"
      ) {
        continue;
      }

      serializedResult[key] = executionResultValue.result as ContractInfo;
    }

    return serializedResult as SerializedDeploymentResult<T>;
  }

  private _checkSafeDeployment(
    deployment: Deployment
  ): DeploymentResult | { _kind: "success" } {
    if (deployment.state.details.force) {
      return { _kind: "success" };
    }

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
