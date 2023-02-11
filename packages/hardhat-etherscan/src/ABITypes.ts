export interface ABIArgumentLengthError extends Error {
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

export function isABIArgumentLengthError(
  error: any
): error is ABIArgumentLengthError {
  return (
    error.code === "INVALID_ARGUMENT" &&
    error.count !== undefined &&
    typeof error.count.types === "number" &&
    typeof error.count.values === "number" &&
    error.value !== undefined &&
    typeof error.value.types === "object" &&
    typeof error.value.values === "object" &&
    error instanceof Error
  );
}

export interface ABIArgumentTypeError extends Error {
  code: "INVALID_ARGUMENT";
  argument: string;
  value: any;
  reason: string;
}

export function isABIArgumentTypeError(
  error: any
): error is ABIArgumentTypeError {
  return (
    error.code === "INVALID_ARGUMENT" &&
    typeof error.argument === "string" &&
    "value" in error &&
    error instanceof Error
  );
}

export interface ABIArgumentOverflowError extends Error {
  code: "NUMERIC_FAULT";
  fault: "overflow";
  value: any;
  reason: string;
  operation: string;
}

export function isABIArgumentOverflowError(
  error: any
): error is ABIArgumentOverflowError {
  return (
    error.code === "NUMERIC_FAULT" &&
    error.fault === "overflow" &&
    typeof error.operation === "string" &&
    "value" in error &&
    error instanceof Error
  );
}
