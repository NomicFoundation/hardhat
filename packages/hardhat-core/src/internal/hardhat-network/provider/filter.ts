import {
  bytesToHex as bufferToHex,
  toBytes,
} from "@nomicfoundation/ethereumjs-util";
import { Bloom } from "@nomicfoundation/ethereumjs-vm";

import { RpcLogOutput } from "./output";

export const LATEST_BLOCK = -1n;

export enum Type {
  LOGS_SUBSCRIPTION = 0,
  PENDING_TRANSACTION_SUBSCRIPTION = 1,
  BLOCK_SUBSCRIPTION = 2,
}

export interface FilterCriteria {
  fromBlock: bigint;
  toBlock: bigint;
  addresses: Uint8Array[];
  normalizedTopics: Array<Array<Uint8Array | null> | null>;
}

export interface Filter {
  id: bigint;
  type: Type;
  criteria?: FilterCriteria;
  deadline: Date;
  hashes: string[];
  logs: RpcLogOutput[];
  subscription: boolean;
}

export function bloomFilter(
  bloom: Bloom,
  addresses: Uint8Array[],
  normalizedTopics: Array<Array<Uint8Array | null> | null>
): boolean {
  if (addresses.length > 0) {
    let included = false;
    for (const address of addresses) {
      if (bloom.check(address)) {
        included = true;
        break;
      }
    }

    if (!included) {
      return false;
    }
  }

  for (const sub of normalizedTopics) {
    if (sub === null || sub.length === 0) {
      continue;
    }

    let included = false;
    for (const topic of sub) {
      if (topic !== null && bloom.check(topic)) {
        included = true;
        break;
      }
    }

    if (!included) {
      return false;
    }
  }
  return true;
}

export function filterLogs(
  logs: RpcLogOutput[],
  criteria: FilterCriteria
): RpcLogOutput[] {
  const filteredLogs: RpcLogOutput[] = [];
  for (const log of logs) {
    const blockNumber = BigInt(log.blockNumber!);
    if (blockNumber < criteria.fromBlock) {
      continue;
    }

    if (criteria.toBlock !== LATEST_BLOCK && blockNumber > criteria.toBlock) {
      continue;
    }

    if (
      criteria.addresses.length !== 0 &&
      !includes(criteria.addresses, toBytes(log.address))
    ) {
      continue;
    }

    if (!topicMatched(criteria.normalizedTopics, log.topics)) {
      continue;
    }

    filteredLogs.push(log);
  }

  return filteredLogs;
}

export function includes(addresses: Uint8Array[], a: Uint8Array): boolean {
  for (const address of addresses) {
    if (Buffer.compare(address, a) === 0) {
      return true;
    }
  }

  return false;
}

export function topicMatched(
  normalizedTopics: Array<Array<Uint8Array | null> | null>,
  logTopics: string[]
): boolean {
  for (let i = 0; i < normalizedTopics.length; i++) {
    if (normalizedTopics.length > logTopics.length) {
      return false;
    }

    const sub = normalizedTopics[i];
    if (sub === null || sub.length === 0) {
      continue;
    }

    let match: boolean = false;
    for (const topic of sub) {
      if (topic === null || logTopics[i] === bufferToHex(topic)) {
        match = true;
        break;
      }
    }
    if (!match) {
      return false;
    }
  }

  return true;
}
