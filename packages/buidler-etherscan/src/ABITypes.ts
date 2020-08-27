export interface ABIArgumentLengthError extends Error {
  code: string;
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
    error.count &&
    typeof error.count.types === "number" &&
    typeof error.count.values === "number" &&
    error.value &&
    typeof error.value.types === "object" &&
    typeof error.value.values === "object" &&
    error instanceof Error
  );
}

export interface ABIArgumentTypeError extends Error {
  code: string;
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
