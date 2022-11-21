import { Contract } from "ethers";

import { ExecutionContext } from "types/deployment";
import { AwaitedEvent } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeAwaitedEvent(
  { event, contract, args }: AwaitedEvent,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  _: ExecutionContext
): Promise<VertexVisitResult> {
  console.log(event);
  console.log(args);
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let attempt = 1;
  try {
    while (true) {
      console.log(`attempt ${attempt}`);

      const contractInstance = new Contract(address, abi);

      const results = contractInstance.filters[event](...resolvedArgs);
      console.log("results");
      console.log(results);

      if (results.topics && results.topics.length !== 0) {
        break;
      }

      attempt++;
    }
  } catch (err) {
    console.log(err);
    return {
      _kind: "failure",
      failure: err as any,
    };
  }

  return {
    _kind: "success",
    result: {},
  };
}
