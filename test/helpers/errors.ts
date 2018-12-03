import { BuidlerError, ErrorDescription } from "../../src/core/errors";
import { expect } from "chai";

export function expectBuidlerError(
  f: () => any,
  errorDescription: ErrorDescription
) {
  expect(f)
    .to.throw(BuidlerError)
    .with.property("number", errorDescription.number);
}
