import { DeploymentResult } from "@nomicfoundation/ignition-core";

export enum UiFutureStatusType {
  UNSTARTED = "UNSTARTED",
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  ERRORED = "ERRORED",
  HELD = "HELD",
}

export enum UiStateDeploymentStatus {
  UNSTARTED = "UNSTARTED",
  DEPLOYING = "DEPLOYING",
  COMPLETE = "COMPLETE",
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

export interface UiFutureHeld {
  type: UiFutureStatusType.HELD;
  heldId: number;
  reason: string;
}

export type UiFutureStatus =
  | UiFutureUnstarted
  | UiFutureSuccess
  | UiFuturePending
  | UiFutureErrored
  | UiFutureHeld;

export interface UiFuture {
  status: UiFutureStatus;
  futureId: string;
}

export type UiBatches = UiFuture[][];

export interface UiState {
  status: UiStateDeploymentStatus;
  chainId: number | null;
  moduleName: string | null;
  batches: UiBatches;
  currentBatch: number;
  result: DeploymentResult | null;
  warnings: string[];
}

export interface AddressMap {
  [label: string]: string;
}
