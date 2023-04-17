import type {
  BaseArgValue,
  ExecutionVertexVisitResult,
  StaticContractCallExecutionVertex,
} from "../../types/executionGraph";

import { Contract, ethers } from "ethers";

import { VertexResultEnum } from "../../types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeStaticContractCall(
  { method, contract, args, signer }: StaticContractCallExecutionVertex,
  resultAccumulator: Map<number, ExecutionVertexVisitResult | undefined>
): Promise<ExecutionVertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let result: BaseArgValue | ethers.utils.Result;
  try {
    const contractInstance = new Contract(address, abi, signer);

    result = await contractInstance[method](...resolvedArgs, {
      from: await signer.getAddress(),
    });
  } catch (err) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: err as any,
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      data: result,
    },
  };
}
