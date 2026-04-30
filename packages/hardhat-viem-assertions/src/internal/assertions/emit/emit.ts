import type { AbiHolder } from "../../abi-types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  Abi,
  ContractEventName,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import { handleEmit } from "./core.js";

export async function emit<
  TContract extends AbiHolder<Abi>,
  TEventName extends ContractEventName<TContract["abi"]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: TContract,
  eventName: TEventName,
): Promise<void> {
  await handleEmit(viem, contractFn, contract, eventName);
}
