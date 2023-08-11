export type JournalMessage = RunStartMessage;

export enum JournalMessageType {
  RUN_START = "RUN_START",
}

export interface RunStartMessage {
  type: JournalMessageType.RUN_START;
  chainId: number;
}
