import { Block, HeaderData } from "@nomicfoundation/ethereumjs-block";
import { RLP } from "@nomicfoundation/ethereumjs-rlp";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  bigIntToBuffer,
  bufArrToArr,
  intToBuffer,
} from "@nomicfoundation/ethereumjs-util";
import {
  PostByzantiumTxReceipt,
  PreByzantiumTxReceipt,
  TxReceipt,
} from "@nomicfoundation/ethereumjs-vm";

import { RunTxResult } from "./vm-adapter";

export type Reward = [address: Address, reward: bigint];

export interface BuildBlockOpts {
  parentBlock: Block;
  headerData?: HeaderData;
}

export interface BlockBuilderAdapter {
  addTransaction(tx: TypedTransaction): Promise<RunTxResult>;

  finalize(rewards: Reward[], timestamp?: bigint): Promise<Block>;

  revert(): Promise<void>;

  getGasUsed(): Promise<bigint>;
}

export function encodeReceipt(receipt: TxReceipt, txType: number) {
  const encoded = Buffer.from(
    RLP.encode(
      bufArrToArr([
        (receipt as PreByzantiumTxReceipt).stateRoot ??
          ((receipt as PostByzantiumTxReceipt).status === 0
            ? Buffer.from([])
            : Buffer.from("01", "hex")),
        bigIntToBuffer(receipt.cumulativeBlockGasUsed),
        receipt.bitvector,
        receipt.logs,
      ])
    )
  );

  if (txType === 0) {
    return encoded;
  }

  // Serialize receipt according to EIP-2718:
  // `typed-receipt = tx-type || receipt-data`
  return Buffer.concat([intToBuffer(txType), encoded]);
}
