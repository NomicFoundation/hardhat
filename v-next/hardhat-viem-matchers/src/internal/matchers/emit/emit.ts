import type { GenericFunction } from "../../../types.js";
import type {
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { Abi, ContractEventName } from "viem";

import { checkEmitted } from "./utils.js";

export async function emit<
  const ViemAbi extends Abi | readonly unknown[],
  ContractName,
>(
  viem: HardhatViemHelpers,
  fn: GenericFunction,
  contract: ContractReturnType<ContractName>,
  eventName: ContractEventName<ViemAbi>,
): Promise<void> {
  await checkEmitted(viem, fn, contract, eventName);
}
