import Bloom from "@nomiclabs/ethereumjs-vm/dist/bloom";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";

import { getRpcLog, RpcLogOutput } from "./output";

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

    if (criteria.toBlock !== -1 && blockNumber > criteria.toBlock) {
      continue;
    }

    let match: boolean = false;
    const bAddress = toBuffer(log.address);
    if (criteria.addresses.length !== 0) {
      for (const address of criteria.addresses) {
        if (Buffer.compare(address, bAddress) === 0) {
          match = true;
        }
      }

      if (!match) {
        continue;
      }
    }

    match = true;
    for (let i = 0; i < criteria.topics.length; i++) {
      if (criteria.topics.length > log.topics.length) {
        match = false;
        continue;
      }

      const sub = criteria.topics[i];
      if (sub == null) {
        continue;
      }

      match = sub.length === 0;
      for (const topic of sub) {
        if (topic === null || log.topics[i] === bufferToHex(topic)) {
          match = true;
          break;
        }
      }
      if (!match) {
        break;
      }
    }

    if (!match) {
      continue;
    }

    filteredLogs.push(log);
  }

  return filteredLogs;
}
