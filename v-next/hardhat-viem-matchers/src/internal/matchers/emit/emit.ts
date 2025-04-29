import type { GenericFunction } from "../../../types.js";
import type {
  ContractAbis,
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { ContractEventName } from "viem";

import { checkEmitted } from "./utils.js";

export async function emit<
  ContractName extends keyof ContractAbis,
  EventName extends ContractEventName<ContractAbis[ContractName]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  fn: GenericFunction,
  contract: ContractReturnType<ContractName>,
  eventName: EventName,
): Promise<void> {
  await checkEmitted(viem, fn, contract, eventName);
}
