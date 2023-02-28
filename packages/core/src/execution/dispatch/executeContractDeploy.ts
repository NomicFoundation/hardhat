import { ContractFactory, ethers } from "ethers";

import type { ExecutionContext } from "types/deployment";
import type {
  ContractDeploy,
  ExecutionResultsAccumulator,
  ExecutionVertexVisitResult,
} from "types/executionGraph";
import { VertexResultEnum } from "types/graph";
import { collectLibrariesAndLink } from "utils/collectLibrariesAndLink";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractDeploy(
  { artifact, args, libraries, value }: ContractDeploy,
  resultAccumulator: ExecutionResultsAccumulator,
  { services, options }: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  let txHash: string;
  try {
    const resolve = resolveFrom(resultAccumulator);

    const resolvedArgs = args.map(resolve).map(toAddress);

    const resolvedLibraries = Object.fromEntries(
      Object.entries(libraries ?? {}).map(([k, v]) => [
        k,
        toAddress(resolve(v)),
      ])
    );

    const linkedByteCode = await collectLibrariesAndLink(
      artifact,
      resolvedLibraries
    );

    const Factory = new ContractFactory(artifact.abi, linkedByteCode);

    const deployTransaction = Factory.getDeployTransaction(...resolvedArgs, {
      value,
    });

    txHash = await services.contracts.sendTx(deployTransaction, options);
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
      value,
    },
  };
}
