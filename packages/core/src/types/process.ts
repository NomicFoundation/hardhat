export enum ProcessResultKind {
  SUCCESS = "success",
  FAILURE = "failure",
}

export interface ProcessStepSuccess<T> {
  _kind: ProcessResultKind.SUCCESS;
  result: T;
}

export interface ProcessStepFailure {
  _kind: ProcessResultKind.FAILURE;
  message: string;
  failures: Error[];
}

export type ProcessStepResult<T> = ProcessStepSuccess<T> | ProcessStepFailure;
