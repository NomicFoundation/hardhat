import {
  DeployPhase,
  ExecutionVertex,
  ExecutionVertexType,
  VertexVisitResultFailure,
} from "@ignored/ignition-core/soon-to-be-removed";

/* new types */

export enum UiFutureStatusType {
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  ERRORED = "ERRORED",
}

export interface UiFutureSuccess {
  type: UiFutureStatusType.SUCCESS;
  result?: string;
}

export interface UiFuturePending {
  type: UiFutureStatusType.PENDING;
}

export interface UiFutureErrored {
  type: UiFutureStatusType.ERRORED;
  message: string;
}

export type UiFutureStatus =
  | UiFutureSuccess
  | UiFuturePending
  | UiFutureErrored;

export interface UiFuture {
  status: UiFutureStatus;
  futureId: string;
}

export interface UiState {
  chainId: number | null;
  futures: UiFuture[];
}

/* end new types */

// keeping old types around for reference until UI fully works again

enum VertexStatusState {
  SUCCESS = "success",
  FAILURE = "failure",
}

interface VertexSuccess {
  status: VertexStatusState.SUCCESS;
  vertex: ExecutionVertex;
}

interface VertexFailure {
  status: VertexStatusState.FAILURE;
  vertex: ExecutionVertex;
  error: unknown;
}

interface Unstarted {
  status: "unstarted";
  vertex: ExecutionVertex;
}

export type VertexStatus = Unstarted | VertexSuccess | VertexFailure;

export type UiVertexStatus = "RUNNING" | "COMPELETED" | "ERRORED" | "HELD";
export interface UiVertex {
  id: number;
  label: string;
  type: ExecutionVertexType;
  status: UiVertexStatus;
}

export interface UiBatch {
  batchCount: number;
  vertexes: UiVertex[];
}

export interface DeploymentError {
  id: number;
  vertex: string;
  message: string;
  failureType: string;
}

export interface DeploymentHold {
  id: number;
  vertex: string;
  event?: string;
}

export class DeploymentState {
  public phase: DeployPhase;
  public moduleName: string;

  private executionVertexes: { [key: string]: VertexStatus };
  private order: number[];
  public batches: UiBatch[];
  private errors: { [key: number]: VertexVisitResultFailure } | undefined;

  constructor({ moduleName }: { moduleName: string }) {
    this.moduleName = moduleName;
    this.phase = "uninitialized";

    this.order = [];

    this.executionVertexes = {};
    this.batches = [];
  }

  public startExecutionPhase() {
    this.phase = "execution";
  }

  public endExecutionPhase(
    endPhase: "complete" | "failed",
    errors?: {
      [key: number]: VertexVisitResultFailure;
    }
  ) {
    this.phase = endPhase;
    this.errors = errors;
  }

  public setBatch(batchCount: number, batch: UiBatch) {
    this.batches[batchCount] = batch;
  }

  public setExecutionVertexes(vertexes: ExecutionVertex[]) {
    this.order = vertexes.map((v) => v.id);

    this.executionVertexes = Object.fromEntries(
      vertexes.map((v): [number, Unstarted] => [
        v.id,
        { status: "unstarted", vertex: v },
      ])
    );
  }

  public setExeuctionVertexAsSuccess(vertex: ExecutionVertex) {
    this.executionVertexes[vertex.id] = {
      vertex,
      status: VertexStatusState.SUCCESS,
    };
  }

  public setExecutionVertexAsFailure(vertex: ExecutionVertex, err: unknown) {
    this.executionVertexes[vertex.id] = {
      vertex,
      status: VertexStatusState.FAILURE,
      error: err,
    };
  }

  public toStatus(): VertexStatus[] {
    return this.order.map((id) => this.executionVertexes[id]);
  }

  public executedCount(): { executed: number; total: number } {
    const total = this.order.length;
    const executed = Object.values(this.executionVertexes).filter(
      (v) => v.status !== "unstarted"
    ).length;

    return { executed, total };
  }

  public getDeploymentErrors(): DeploymentError[] {
    if (this.batches.length === 0) {
      return [];
    }

    const lastBatch = this.batches[this.batches.length - 1];
    const errors = this.errors ?? {};

    return Object.keys(errors)
      .map((ids: string) => {
        const id = parseInt(ids, 10);

        const error = errors[id];
        const vertex = lastBatch.vertexes.find((v) => v.id === id);

        if (vertex === undefined) {
          return undefined;
        }

        const errorDescription = this._buildErrorDescriptionFrom(
          error.failure,
          vertex
        );

        return errorDescription;
      })
      .filter((x): x is DeploymentError => x !== undefined);
  }

  private _buildErrorDescriptionFrom(
    error: Error,
    vertex: UiVertex
  ): DeploymentError {
    const message = "reason" in error ? (error as any).reason : error.message;

    return {
      id: vertex.id,
      vertex: vertex.label,
      message,
      failureType: this._resolveFailureTypeFrom(vertex),
    };
  }

  private _resolveFailureTypeFrom(vertex: UiVertex): string {
    switch (vertex.type) {
      case "ContractCall":
        return "Failed contract call";
      case "StaticContractCall":
        return "Failed static contract call";
      case "ContractDeploy":
        return "Failed contract deploy";
      case "DeployedContract":
        return "-";
      case "LibraryDeploy":
        return "Failed library deploy";
      case "AwaitedEvent":
        return "Failed awaited event";
      case "SentETH":
        return "Failed to send ETH";
    }
  }
}

export interface AddressMap {
  [label: string]: string;
}
