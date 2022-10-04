import setupDebug from "debug";

import { IgnitionDeployOptions } from "Ignition";
import { ExecutionGraph } from "execution/ExecutionGraph";
import { ExecuteBatchResult } from "execution/batch/types";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import { DeployState, UpdateUiAction } from "types/deployment";
import { VertexVisitResult, VertexVisitResultFailure } from "types/graph";
import { Providers } from "types/providers";
import { Recipe } from "types/recipeGraph";

import {
  deployStateReducer,
  initializeDeployState,
} from "./deployStateReducer";

const log = setupDebug("ignition:deployment");

export class Deployment {
  public state: DeployState;
  public services: Services;
  public ui?: UpdateUiAction;

  constructor(recipe: Recipe, services: Services, ui?: UpdateUiAction) {
    this.state = initializeDeployState(recipe);
    this.services = services;
    this.ui = ui;
  }

  public static setupServices(
    options: IgnitionDeployOptions,
    providers: Providers
  ): Services {
    log("Create journal with path '%s'", options.pathToJournal);

    const journal =
      options.pathToJournal !== undefined
        ? // TODO: bring back FileJournal
          new InMemoryJournal() // ? new FileJournal(options.pathToJournal)
        : new InMemoryJournal();

    const serviceOptions = {
      providers,
      journal,
      txPollingInterval: 300,
    };

    const services: Services = createServices(
      "recipeIdEXECUTE",
      "executorIdEXECUTE",
      serviceOptions
    );

    return services;
  }

  public setChainId(chainId: number) {
    log("ChainId resolved as '%s'", chainId);
    this.state = deployStateReducer(this.state, {
      type: "SET_CHAIN_ID",
      chainId,
    });
  }

  public startValidation() {
    log("Validate recipe graph");
    this.state = deployStateReducer(this.state, {
      type: "START_VALIDATION",
    });

    this._renderToUi(this.state);
  }

  public failValidation(errors: Error[]) {
    log(`Validation failed with errors`, errors);
    this.state = deployStateReducer(this.state, {
      type: "VALIDATION_FAIL",
      errors,
    });

    this._renderToUi(this.state);
  }

  public transformComplete(executionGraph: ExecutionGraph) {
    log(`Transform complete`, executionGraph);
    this.state = deployStateReducer(this.state, {
      type: "TRANSFORM_COMPLETE",
      executionGraph,
    });

    this._renderToUi(this.state);
  }

  public startExecutionPhase(executionGraph: ExecutionGraph) {
    log(`Starting Execution`);
    this.state = deployStateReducer(this.state, {
      type: "START_EXECUTION_PHASE",
      executionGraph,
    });

    this._renderToUi(this.state);
  }

  public updateExecutionWithNewBatch(batch: Set<number>) {
    log(`Update execution with new batch`, batch);
    this.state = deployStateReducer(this.state, {
      type: "UPDATE_EXECUTION_WITH_NEW_BATCH",
      batch,
    });

    this._renderToUi(this.state);
  }

  public updateExecutionWithBatchResults(batchResult: ExecuteBatchResult) {
    log(`Update execution with batch results`, batchResult);
    this.state = deployStateReducer(this.state, {
      type: "UPDATE_EXECUTION_WITH_BATCH_RESULTS",
      batchResult,
    });

    this._renderToUi(this.state);
  }

  public updateCurrentBatchWithResult(
    vertexId: number,
    result: VertexVisitResult
  ) {
    log(`Update current with batch result for ${vertexId}`, result);
    this.state = deployStateReducer(this.state, {
      type: "UPDATE_CURRENT_BATCH_WITH_RESULT",
      vertexId,
      result,
    });

    this._renderToUi(this.state);
  }

  public readExecutionErrors() {
    const errors = [...this.state.execution.errored].reduce(
      (acc: { [key: number]: VertexVisitResultFailure }, id) => {
        const result = this.state.execution.resultsAccumulator.get(id);

        if (
          result === undefined ||
          result === null ||
          result._kind === "success"
        ) {
          return acc;
        }

        acc[id] = result;

        return acc;
      },
      {}
    );

    return errors;
  }

  public hasUnstarted(): boolean {
    return this.state.execution.unstarted.size > 0;
  }

  public hasErrors(): boolean {
    return this.state.execution.errored.size > 0;
  }

  private _renderToUi(state: DeployState) {
    if (this.ui === undefined) {
      return;
    }

    this.ui(state);
  }
}
