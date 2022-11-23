import { Contract } from "ethers";

import { ExecutionContext } from "types/deployment";
import { AwaitedEvent } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeAwaitedEvent(
  { event, contract, args }: AwaitedEvent,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  { services, options }: ExecutionContext
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let eventResult;
  try {
    const contractInstance = new Contract(address, abi);

    const filter = contractInstance.filters[event](...resolvedArgs);

    eventResult = await services.transactions.waitForEvent(
      filter,
      options.awaitEventDuration
    );

    if (eventResult === null) {
      // todo: implement on hold state
      return {
        _kind: "failure",
        failure: new Error(
          "Event not emitted within duration - try again later"
        ),
      };
    }
  } catch (err) {
    return {
      _kind: "failure",
      failure: err as any,
    };
  }

  return {
    _kind: "success",
    result: {
      hash: eventResult.transactionHash,
    },
  };
}
