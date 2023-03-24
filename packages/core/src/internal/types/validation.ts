import { CallPoints } from "./deploymentGraph";
import { ResultsAccumulator, VertexVisitResult, VisitResult } from "./graph";
import { Services } from "./services";

export type ValidationVisitResult = VisitResult<undefined>;

export type ValidationVertexVisitResult = VertexVisitResult<undefined>;

export type ValidationResultsAccumulator = ResultsAccumulator<undefined>;

export interface ValidationDispatchContext {
  services: Services;
  callPoints: CallPoints;
}
