import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { ArtifactsMap } from "hardhat/types/artifacts";

export type Token = GetContractReturnType<ArtifactsMap["MockToken"]["abi"]>;

export type MatchersContract = GetContractReturnType<
  ArtifactsMap["Matchers"]["abi"]
>;

export type ChangeEtherBalance = GetContractReturnType<
  ArtifactsMap["ChangeEtherBalance"]["abi"]
>;

export type EventsContract = GetContractReturnType<
  ArtifactsMap["Events"]["abi"]
>;

export type AnotherContract = GetContractReturnType<
  ArtifactsMap["AnotherContract"]["abi"]
>;
