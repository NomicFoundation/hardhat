import { ExecutionVertex } from "../types/executionGraph";

interface VertexSuccess {
  status: "success";
  vertex: ExecutionVertex;
}

interface Unstarted {
  status: "unstarted";
  vertex: ExecutionVertex;
}

export type VertexStatus = VertexSuccess | Unstarted;

export class DeploymentState {
  private vertexes: { [key: string]: VertexStatus };
  private order: number[];

  constructor() {
    this.vertexes = {};
    this.order = [];
  }

  public setVertexes(vertexes: ExecutionVertex[]) {
    this.order = vertexes.map((v) => v.id);

    this.vertexes = Object.fromEntries(
      vertexes.map((v): [number, Unstarted] => [
        v.id,
        { status: "unstarted", vertex: v },
      ])
    );
  }

  public setSuccess(vertex: ExecutionVertex) {
    this.vertexes[vertex.id] = {
      vertex,
      status: "success",
    };
  }

  public toStatus(): VertexStatus[] {
    return this.order.map((id) => this.vertexes[id]);
  }

  public executedCount(): { executed: number; total: number } {
    const total = this.order.length;
    const executed = Object.values(this.vertexes).filter(
      (v) => v.status !== "unstarted"
    ).length;

    return { executed, total };
  }
}
