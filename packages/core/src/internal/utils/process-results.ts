import {
  ProcessResultKind,
  ProcessStepFailure,
  ProcessStepResult,
  ProcessStepSuccess,
} from "../../types/process";

export const processStepSucceeded = <T>(result: T): ProcessStepSuccess<T> => ({
  _kind: ProcessResultKind.SUCCESS,
  result,
});

export const processStepFailed = (
  message: string,
  failures: Error[]
): ProcessStepFailure => ({
  _kind: ProcessResultKind.FAILURE,
  message,
  failures,
});

export const processStepErrored = (
  error: unknown,
  message: string
): ProcessStepFailure => {
  const resolvedError =
    error instanceof Error
      ? error
      : new Error(`Failed with unknown error ${error as any}`);

  return processStepFailed(message, [resolvedError]);
};

export const isFailure = <T>(
  result: ProcessStepResult<T>
): result is ProcessStepFailure => {
  return result._kind === ProcessResultKind.FAILURE;
};
