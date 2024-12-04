import assert from "node:assert/strict";

/**
 * We duplicate this to avoid a circular dependency between packages.
 */
export interface ValidationError {
  path: Array<string | number>;
  message: string;
}

/**
 * An expected validation error, which is a ValidationError with an optional
 * message. If the message is not provided, it's not asserted.
 */
export interface ExpectedValidationError {
  path: Array<string | number>;
  message?: string;
}

/**
 * Asserts that the validations results are equal to the expected ones, ignoring
 * the order of the errors.
 *
 * @param validationResult The results of running a validation function.
 * @param expectedErrors The expected errors, which can omit the message, and
 * don't need to be in the same order.
 */
export function assertValidationErrors(
  validationResult: ValidationError[],
  expectedErrors: ExpectedValidationError[],
): void {
  const resultsByJsonPath = groupByJsonPath(validationResult);
  const expectedErrorsByJsonPath = groupByJsonPath(expectedErrors);

  for (const [jsonPath, expectedErrorsForPath] of expectedErrorsByJsonPath) {
    const resultErrors = resultsByJsonPath.get(jsonPath);

    if (resultErrors === undefined) {
      assert.fail(
        `Expected errors for path ${jsonPath} but none were found. Got these instead ${JSON.stringify(validationResult, undefined, 2)}`,
      );

      return;
    }

    for (const expectedError of expectedErrorsForPath) {
      if (expectedError.message === undefined) {
        continue;
      }

      const isPresent = resultErrors.some(
        (r) => r.message === expectedError.message,
      );

      if (!isPresent) {
        assert.fail(
          `Expected an error for path ${jsonPath} to have message "${expectedError.message}" but found these instead ${JSON.stringify(resultErrors.map((e) => e.message))}`,
        );
        return;
      }
    }

    if (expectedErrorsForPath.length !== resultErrors.length) {
      assert.fail(
        `Expected ${expectedErrorsForPath.length} errors for path ${jsonPath} but found ${resultErrors.length} instead: ${JSON.stringify(resultErrors.map((e) => e.message))}`,
      );
    }
  }

  for (const [jsonPath, resultErrors] of resultsByJsonPath) {
    const expectedErrorsForPath = expectedErrorsByJsonPath.get(jsonPath);

    if (expectedErrorsForPath === undefined) {
      assert.fail(
        `No errors were expected for path ${jsonPath} but found these instead ${JSON.stringify(resultErrors.map((e) => e.message))}`,
      );
      return;
    }
  }
}

function groupByJsonPath<
  ErrorT extends ValidationError | ExpectedValidationError,
>(validationErrors: ErrorT[]): Map<string, ErrorT[]> {
  const groupedByPath = new Map<string, ErrorT[]>();

  for (const validationError of validationErrors) {
    const jsonPath = JSON.stringify(validationError.path);
    const errors = groupedByPath.get(jsonPath) ?? [];
    errors.push(validationError);
    groupedByPath.set(jsonPath, errors);
  }

  return groupedByPath;
}
