export interface ABIArgumentLengthErrorType extends Error {
  code: "INVALID_ARGUMENT";
  count: {
    types: number;
    values: number;
  };
  value: {
    types: Array<{
      name: string;
      type: string;
    }>;
    values: any[];
  };
  reason: string;
}

export interface ABIArgumentTypeErrorType extends Error {
  code: "INVALID_ARGUMENT";
  argument: string;
  value: any;
  reason: string;
}

export interface ABIArgumentOverflowErrorType extends Error {
  code: "NUMERIC_FAULT";
  fault: "overflow";
  value: any;
  reason: string;
  operation: string;
}

export const isABIArgumentLengthError = (
  error: any
): error is ABIArgumentLengthErrorType =>
  error.code === "INVALID_ARGUMENT" &&
  error.count !== undefined &&
  typeof error.count.types === "number" &&
  typeof error.count.values === "number" &&
  error.value !== undefined &&
  typeof error.value.types === "object" &&
  typeof error.value.values === "object" &&
  error instanceof Error;

export const isABIArgumentTypeError = (
  error: any
): error is ABIArgumentTypeErrorType =>
  error.code === "INVALID_ARGUMENT" &&
  typeof error.argument === "string" &&
  "value" in error &&
  error instanceof Error;

export const isABIArgumentOverflowError = (
  error: any
): error is ABIArgumentOverflowErrorType =>
  error.code === "NUMERIC_FAULT" &&
  error.fault === "overflow" &&
  typeof error.operation === "string" &&
  "value" in error &&
  error instanceof Error;
