import Bloom from "@nomiclabs/ethereumjs-vm/dist/bloom";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";

import { RpcLogOutput } from "./output";

export const LATEST_BLOCK = -1;

export enum Type {
  LOGS_SUBSCRIPTION = 0,
  PENDING_TRANSACTION_SUBSCRIPTION = 1,
  BLOCK_SUBSCRIPTION = 2
}

export interface FilterCriteria {
  fromBlock: number;
  toBlock: number;
  addresses: Buffer[];
  topics: Array<Array<Buffer | null> | null>;
}

export interface Filter {
  id: number;
  type: Type;
  criteria?: FilterCriteria;
  deadline: Date;
  hashes: string[];
  logs: RpcLogOutput[];
  subscription: boolean;
}

export function bloomFilter(
  bloom: Bloom,
  addresses: Buffer[],
  topics: Array<Array<Buffer | null> | null>
): boolean {
  if (addresses.length > 0 && !bloom.multiCheck(addresses)) {
    return false;
  }

  for (const sub of topics) {
    if (sub == null) {
      continue;
    }

    let included = sub.length === 1;
    for (const topic of sub) {
      if (topic != null && bloom.check(topic)) {
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
    const blockNumber = new BN(toBuffer(log.blockNumber!)).toNumber();
    if (blockNumber < criteria.fromBlock) {
      continue;
    }

    if (criteria.toBlock !== LATEST_BLOCK && blockNumber > criteria.toBlock) {
      continue;
    }

    if (
      criteria.addresses.length !== 0 &&
      !includes(criteria.addresses, toBuffer(log.address))
    ) {
      continue;
    }

    if (!topicMatched(criteria.topics, log.topics)) {
      continue;
    }

    filteredLogs.push(log);
  }

  return filteredLogs;
}

export function includes(addresses: Buffer[], a: Buffer): boolean {
  for (const address of addresses) {
    if (Buffer.compare(address, a) === 0) {
      return true;
    }
  }

  return false;
}

export function topicMatched(
  topics: Array<Array<Buffer | null> | null>,
  logTopics: string[]
): boolean {
  let match = true;
  for (let i = 0; i < topics.length; i++) {
    if (topics.length > logTopics.length) {
      return false;
    }

    const sub = topics[i];
    if (sub == null) {
      continue;
    }

    match = sub.length === 0;
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
