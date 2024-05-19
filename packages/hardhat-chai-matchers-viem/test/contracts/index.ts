import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { erc20Abi } from "viem";

import type { matchersAbi } from "./matchersAbi";
import type { changeEtherBalanceAbi } from "./changeEtherBalanceAbi";
import type { eventsAbi } from "./eventsAbi";
import type { anotherContractAbi } from "./anotherContractAbi";

export type Token = GetContractReturnType<typeof erc20Abi>;

export type MatchersContract = GetContractReturnType<typeof matchersAbi>;

export type ChangeEtherBalance = GetContractReturnType<
  typeof changeEtherBalanceAbi
>;

export type EventsContract = GetContractReturnType<typeof eventsAbi>;

export type AnotherContract = GetContractReturnType<typeof anotherContractAbi>;
