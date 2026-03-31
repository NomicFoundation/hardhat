import { mock, type Mock } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

export function mockRequestSecretFn(
  valuesToMock: string[],
): Mock<() => Promise<string>> {
  valuesToMock = valuesToMock.reverse();

  return mock.fn(async () => {
    const v = valuesToMock.pop();

    assertHardhatInvariant(v !== undefined, "valuesToMock should not be empty");

    return v;
  });
}
