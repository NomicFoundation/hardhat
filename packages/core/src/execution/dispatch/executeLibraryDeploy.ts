import { ContractFactory, ethers } from "ethers";

import type { ExecutionContext } from "types/deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertexVisitResult,
  LibraryDeploy,
} from "types/executionGraph";
import { VertexResultEnum } from "types/graph";
import { collectLibrariesAndLink } from "utils/collectLibrariesAndLink";

import { resolveFrom, toAddress } from "./utils";

export async function executeLibraryDeploy(
  { artifact, args, signer }: LibraryDeploy,
  resultAccumulator: ExecutionResultsAccumulator,
  { services, options }: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  let txHash: string;
  try {
    const resolvedArgs = args
      .map(resolveFrom(resultAccumulator))
      .map(toAddress);

    const linkedByteCode = await collectLibrariesAndLink(artifact, {});

    const Factory = new ContractFactory(artifact.abi, linkedByteCode);

    const deployTransaction = Factory.getDeployTransaction(...resolvedArgs);

    txHash = await services.contracts.sendTx(deployTransaction, {
      ...options,
      signer,
    });
  } catch (err) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: err as any,
    };
  }

  let receipt: ethers.providers.TransactionReceipt;
  try {
    receipt = await services.transactions.wait(txHash);
  } catch {
    return {
      _kind: VertexResultEnum.HOLD,
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      name: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      address: receipt.contractAddress,
    },
  };
}
