import type { ExecutionContext } from "../../types/deployment";
import type {
  AwaitedEventExecutionVertex,
  ExecutionVertexVisitResult,
} from "../../types/executionGraph";

import { Contract, ethers } from "ethers";

import { VertexResultEnum } from "../../types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeAwaitedEvent(
  { event, address, abi, args }: AwaitedEventExecutionVertex,
  resultAccumulator: Map<number, ExecutionVertexVisitResult | undefined>,
  { services, options }: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = [...args, address].map(resolve).map(toAddress);

  const resolvedAddress = resolvedArgs.pop();

  let topics: ethers.utils.Result;
  try {
    const contractInstance = new Contract(resolvedAddress, abi);

    const filter = contractInstance.filters[event](...resolvedArgs);

    const eventResult = await services.transactions.waitForEvent(
      filter,
      options.eventDuration
    );

    if (eventResult === null) {
      return {
        _kind: VertexResultEnum.HOLD,
      };
    }

    topics = contractInstance.interface.parseLog(eventResult).args;
  } catch (err) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: err as any,
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      topics,
    },
  };
}
