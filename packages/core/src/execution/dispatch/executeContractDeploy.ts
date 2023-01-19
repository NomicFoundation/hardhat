import { ContractFactory, ethers } from "ethers";

import { ExecutionContext } from "types/deployment";
import { ContractDeploy } from "types/executionGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { collectLibrariesAndLink } from "utils/collectLibrariesAndLink";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractDeploy(
  { artifact, args, libraries, value }: ContractDeploy,
  resultAccumulator: ResultsAccumulator,
  { services, options }: ExecutionContext
): Promise<VertexVisitResult> {
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
      _kind: "failure",
      failure: err as any,
    };
  }

  let receipt: ethers.providers.TransactionReceipt;
  try {
    receipt = await services.transactions.wait(txHash);
  } catch {
    return {
      _kind: "hold",
    };
  }

  return {
    _kind: "success",
    result: {
      name: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      address: receipt.contractAddress,
      value,
    },
  };
}
