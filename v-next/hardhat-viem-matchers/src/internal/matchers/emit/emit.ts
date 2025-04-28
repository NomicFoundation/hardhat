import type { GenericFunction } from "../../../types.js";
import type {
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { Abi, ContractEventName } from "viem";

import { checkEmitted } from "./utils.js";

export async function emit<
  const ViemAbi extends Abi | readonly unknown[],
  ContractName,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  fn: GenericFunction,
  contract: ContractReturnType<ContractName>,
  eventName: ContractEventName<ViemAbi>,
): Promise<void> {
  await checkEmitted(viem, fn, contract, eventName);
}
