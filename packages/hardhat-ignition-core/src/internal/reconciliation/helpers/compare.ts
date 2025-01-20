import { Future } from "../../../types/module";
import { ReconciliationFutureResultFailure } from "../types";
import { fail } from "../utils";

export function compare<
  ValueT extends bigint | number | boolean | string | undefined
>(
  future: Future,
  fieldName: string,
  existingValue: ValueT,
  newValue: ValueT,
  messageSuffix?: string
): ReconciliationFutureResultFailure | undefined {
  if (existingValue !== newValue) {
    return fail(
      future,
      `${fieldName} has been changed from ${
        existingValue?.toString() ?? '"undefined"'
      } to ${newValue?.toString() ?? '"undefined"'}${messageSuffix ?? ""}`
    );
  }
}
