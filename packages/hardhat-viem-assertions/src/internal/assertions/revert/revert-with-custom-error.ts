import type { AbiHolder } from "../../abi-types.js";
import type {
  Abi,
  ContractErrorName,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import { handleRevertWithCustomError } from "./handle-revert-with-custom-error.js";

export async function revertWithCustomError<TContract extends AbiHolder<Abi>>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: TContract,
  customErrorName: ContractErrorName<TContract["abi"]>,
): Promise<void> {
  await handleRevertWithCustomError(contractFn, contract, customErrorName);
}
