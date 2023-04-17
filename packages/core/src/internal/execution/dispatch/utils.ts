import type {
  ArgValue,
  ExecutionResultsAccumulator,
} from "../../types/executionGraph";

import { IgnitionError } from "../../../errors";
import { VertexResultEnum } from "../../types/graph";
import {
  isDependable,
  isEventParam,
  isProxy,
  isStaticCallFuture,
} from "../../utils/guards";

export function toAddress(v: any) {
  if (typeof v === "object" && "address" in v) {
    return v.address;
  }

  return v;
}

export function resolveFrom(context: ExecutionResultsAccumulator) {
  return (arg: ArgValue) => resolveFromContext(context, arg);
}

function resolveFromContext(
  context: ExecutionResultsAccumulator,
  arg: ArgValue
): any {
  if (isProxy(arg)) {
    return resolveFromContext(context, arg.value);
  }

  if (!isDependable(arg) && !isEventParam(arg)) {
    return arg;
  }

  const entry = context.get(arg.vertexId);

  if (entry === undefined) {
    throw new IgnitionError(
      `No context entry for ${arg.vertexId} (${arg.label})`
    );
  }

  if (entry._kind === VertexResultEnum.FAILURE) {
    throw new IgnitionError(
      `Looking up context on a failed vertex - violation of constraint`
    );
  }

  if (entry._kind === VertexResultEnum.HOLD) {
    throw new IgnitionError(
      `Looking up context on a on hold - violation of constraint`
    );
  }

  if (isEventParam(arg) && "topics" in entry.result) {
    return entry.result.topics[arg.label];
  }

  if (isStaticCallFuture(arg) && "data" in entry.result) {
    return entry.result.data;
  }

  return entry.result;
}
