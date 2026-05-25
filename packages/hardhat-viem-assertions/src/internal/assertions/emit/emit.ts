import type { AbiHolder } from "../../../abi-types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { Abi, ContractEventName, Hash } from "viem";

import { handleEmit } from "./core.js";

export async function emit<
  TContract extends AbiHolder<Abi>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  txHash: Hash | Promise<Hash>,
  contract: TContract,
  eventName: ContractEventName<TContract["abi"]>,
): Promise<void> {
  await handleEmit(viem, txHash, contract, eventName);
}
