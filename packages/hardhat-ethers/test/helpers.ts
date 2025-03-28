import { assert } from "chai";
// eslint-disable-next-line prettier/prettier
import { type ContractRunner, type Signer } from "ethers";

export function assertWithin(
  value: number | bigint,
  min: number | bigint,
  max: number | bigint
) {
  if (value < min || value > max) {
    assert.fail(`Expected ${value} to be between ${min} and ${max}`);
  }
}

export function assertIsNotNull<T>(
  value: T
): asserts value is Exclude<T, null> {
  assert.isNotNull(value);
}

export function assertIsSigner(
  value: ContractRunner | null
): asserts value is Signer {
  assertIsNotNull(value);
  assert.isTrue("getAddress" in value);
  assert.isTrue("signTransaction" in value);
}

export const sleep = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export async function tryUntil(f: () => any) {
  const maxTries = 20;
  let tries = 0;
  while (tries < maxTries) {
    try {
      await f();
      return;
    } catch {}

    await sleep(50);

    tries++;
  }

  f();
}
