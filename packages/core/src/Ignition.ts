import type {
  DeploymentResult,
  IgnitionDeployOptions,
  UpdateUiAction,
} from "./internal/types/deployment";
import type { ICommandJournal } from "./internal/types/journal";
import type { Module, ModuleDict } from "./types/module";
import type { IgnitionPlan } from "./types/plan";
import type {
  ContractInfo,
  SerializedDeploymentResult,
} from "./types/serialization";

import setupDebug from "debug";

import { IgnitionError } from "./errors";
import { Deployment } from "./internal/deployment/Deployment";
import { execute } from "./internal/execution/execute";
import { loadJournalInto } from "./internal/execution/loadJournalInto";
import { hashExecutionGraph } from "./internal/execution/utils";
import { NoopCommandJournal } from "./internal/journal/NoopCommandJournal";
import { generateDeploymentGraphFrom } from "./internal/process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "./internal/process/transformDeploymentGraphToExecutionGraph";
import { createServices } from "./internal/services/createServices";
import {
  ExecutionResultsAccumulator,
  ExecutionVisitResult,
  IExecutionGraph,
} from "./internal/types/executionGraph";
import { Services } from "./internal/types/services";
import {
  isFailure,
  processStepFailed,
  processStepSucceeded,
} from "./internal/utils/process-results";
import { resolveProxyValue } from "./internal/utils/proxy";
import { validateDeploymentGraph } from "./internal/validation/validateDeploymentGraph";
import {
  IgnitionConstructorArgs,
  IgnitionCreationArgs,
} from "./types/ignition";
import { ProcessStepResult } from "./types/process";

const log = setupDebug("ignition:main");

/**
 * The entry point for deploying using _Ignition_.
 *
 * @internal
 */
export class Ignition {
  private _services: Services;
  private _uiRenderer: UpdateUiAction;
  private _journal: ICommandJournal;

  /**
   * A factory function to create a new Ignition instance based on the
   * given providers.
   *
   * @param options - The setup options for Ignition.
   * @returns The setup Ignition instance
   */
  public static create({
    providers,
    uiRenderer = () => {},
    journal = new NoopCommandJournal(),
  }: IgnitionCreationArgs) {
    return new Ignition({
      services: createServices(providers),
      uiRenderer,
      journal,
    });
  }

  /**
   * Creates a new Ignition instance that will manage and orchestrate a
   * deployment.
   *
   * @param options - The service-based setup options for Ignition.
   *
   * @internal
   */
  protected constructor({
    services,
    uiRenderer,
    journal,
  }: IgnitionConstructorArgs) {
    this._services = services;
    this._uiRenderer = uiRenderer;
    this._journal = journal;
  }

  /**
   * Run a deployment based on a given Ignition module on-chain,
   * leveraging any configured journal to record.
   *
   * @param ignitionModule - An Ignition module
   * @param options - Configuration options
   * @returns A struct indicating whether the deployment was
   * a success, failure or hold. A successful result will
   * include the addresses of the deployed contracts.
   *
   * @internal
   */
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
      const [chainId, accounts, artifacts] = await Promise.all([
        this._services.network.getChainId(),
        this._services.accounts.getAccounts(),
        this._services.artifacts.getAllArtifacts(),
      ]);

      await deployment.setDeploymentDetails({
        accounts,
        chainId,
        artifacts,
        networkName: options.networkName,
        force: options.force,
      });

      const constructExecutionGraphResult =
        await this._constructExecutionGraphFrom(deployment, ignitionModule);

      if (isFailure(constructExecutionGraphResult)) {
        log("Failed to construct execution graph");

        return {
          _kind: "failure",
          failures: [
            constructExecutionGraphResult.message,
            constructExecutionGraphResult.failures,
          ],
        };
      }

      const { executionGraph, moduleOutputs } =
        constructExecutionGraphResult.result;

      log("Execution graph constructed");
      await deployment.transformComplete(executionGraph);

      // rebuild previous execution state based on journal
      log("Load journal entries for network");
      await loadJournalInto(deployment, this._journal);

      // check that safe to run based on changes
      log("Reconciling previous runs with current module");
      const moduleChangeResult = this._checkSafeDeployment(deployment);

      if (isFailure(moduleChangeResult)) {
        log("Failed to reconcile");
        await deployment.failReconciliation();

        return {
          _kind: "failure",
          failures: [moduleChangeResult.message, moduleChangeResult.failures],
        };
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

  /**
   * Construct a plan (or dry run) describing how a deployment will be executed
   * for the given module.
   *
   * @param deploymentModule - The Ignition module to be deployed
   * @returns The deployment details as a plan
   *
   * @internal
   */
  public async plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan> {
    log(`Start plan`);

    const [chainId, accounts, artifacts] = await Promise.all([
      this._services.network.getChainId(),
      this._services.accounts.getAccounts(),
      this._services.artifacts.getAllArtifacts(),
    ]);

    const constructionResult = generateDeploymentGraphFrom(deploymentModule, {
      chainId,
      accounts,
      artifacts,
    });

    if (isFailure(constructionResult)) {
      throw new IgnitionError(constructionResult.message);
    }

    const { graph: deploymentGraph, callPoints } = constructionResult.result;

    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      callPoints,
      this._services
    );

    if (isFailure(validationResult)) {
      throw new IgnitionError(validationResult.message);
    }

    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      this._services
    );

    if (isFailure(transformResult)) {
      throw new IgnitionError(transformResult.message);
    }

    const { executionGraph } = transformResult.result;

    return { deploymentGraph, executionGraph };
  }

  private async _constructExecutionGraphFrom<T extends ModuleDict>(
    deployment: Deployment,
    ignitionModule: Module<T>
  ): Promise<
    ProcessStepResult<{ executionGraph: IExecutionGraph; moduleOutputs: T }>
  > {
    log("Generate deployment graph from module");
    const deploymentGraphConstructionResult = generateDeploymentGraphFrom(
      ignitionModule,
      {
        chainId: deployment.state.details.chainId,
        accounts: deployment.state.details.accounts,
        artifacts: deployment.state.details.artifacts,
      }
    );

    if (isFailure(deploymentGraphConstructionResult)) {
      await deployment.failUnexpected(
        deploymentGraphConstructionResult.failures
      );

      return deploymentGraphConstructionResult;
    }

    const {
      graph: deploymentGraph,
      callPoints,
      moduleOutputs,
    } = deploymentGraphConstructionResult.result;

    await deployment.startValidation();
    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      callPoints,
      deployment.services
    );

    if (isFailure(validationResult)) {
      await deployment.failValidation(validationResult.failures);

      return validationResult;
    }

    log("Transform deployment graph to execution graph");
    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      deployment.services
    );

    if (isFailure(transformResult)) {
      await deployment.failUnexpected(transformResult.failures);

      return transformResult;
    }

    return processStepSucceeded({
      executionGraph: transformResult.result.executionGraph,
      moduleOutputs,
    });
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
  ): ProcessStepResult<boolean> {
    if (deployment.state.details.force) {
      return processStepSucceeded(true);
    }

    if (deployment.state.transform.executionGraph === null) {
      return processStepFailed("Module reconciliation failed", [
        new IgnitionError(
          "Execution graph must be set to check safe deployment"
        ),
      ]);
    }

    const previousExecutionGraphHash =
      deployment.state.execution.executionGraphHash;

    if (previousExecutionGraphHash === "") {
      return processStepSucceeded(true);
    }

    const currentExecutionGraphHash = hashExecutionGraph(
      deployment.state.transform.executionGraph
    );

    if (previousExecutionGraphHash === currentExecutionGraphHash) {
      return processStepSucceeded(true);
    }

    return processStepFailed("Module reconciliation failed", [
      new IgnitionError(
        "The module has been modified since the last run. You can ignore the previous runs with the '--force' flag."
      ),
    ]);
  }
}
