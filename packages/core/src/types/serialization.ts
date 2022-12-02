import type { ethers } from "ethers";

export type SerializedFutureResult =
  | { _kind: "string"; value: string }
  | { _kind: "number"; value: number }
  | { _kind: "contract"; value: Contract }
  | { _kind: "tx"; value: Tx }
  | { _kind: "event"; value: Event };

export interface SerializedDeploymentResult {
  [key: string]: SerializedFutureResult;
}

export type FutureOutput = string | number | Contract | Tx | Event;

export interface Contract {
  name: string;
  address: string;
  abi: any[];
}

export interface Tx {
  hash: string;
}

export interface Event {
  topics: ethers.utils.Result;
}
