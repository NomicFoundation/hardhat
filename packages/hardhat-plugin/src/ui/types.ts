export enum UiFutureStatusType {
  UNSTARTED = "UNSTARTED",
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  ERRORED = "ERRORED",
}

export interface UiFutureUnstarted {
  type: UiFutureStatusType.UNSTARTED;
}

export interface UiFutureSuccess {
  type: UiFutureStatusType.SUCCESS;
  result?: string;
}

export interface UiFuturePending {
  type: UiFutureStatusType.PENDING;
}

export interface UiFutureErrored {
  type: UiFutureStatusType.ERRORED;
  message: string;
}

export type UiFutureStatus =
  | UiFutureUnstarted
  | UiFutureSuccess
  | UiFuturePending
  | UiFutureErrored;

export interface UiFuture {
  status: UiFutureStatus;
  futureId: string;
}

export type UiBatches = UiFuture[][];

export interface UiState {
  chainId: number | null;
  batches: UiBatches;
}

export interface AddressMap {
  [label: string]: string;
}
