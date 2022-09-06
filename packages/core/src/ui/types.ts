import { ExecutionVertex } from "../types/executionGraph";

interface VertexSuccess {
  status: "success";
  vertex: ExecutionVertex;
}

interface VertexFailure {
  status: "failure";
  vertex: ExecutionVertex;
  error: unknown;
}

interface Unstarted {
  status: "unstarted";
  vertex: ExecutionVertex;
}

export type VertexStatus = Unstarted | VertexSuccess | VertexFailure;

export class DeploymentState {
  private phase: "validation" | "execution" | "uninitialized";
  private validationErrors: string[];
  private executionVertexes: { [key: string]: VertexStatus };
  private order: number[];

  constructor() {
    this.phase = "uninitialized";

    this.order = [];

    this.validationErrors = [];
    this.executionVertexes = {};
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
      status: "success",
    };
  }

  public setExecutionVertexAsFailure(vertex: ExecutionVertex, err: unknown) {
    this.executionVertexes[vertex.id] = {
      vertex,
      status: "failure",
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
}
