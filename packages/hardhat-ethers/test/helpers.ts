import { assert } from "chai";
import { ContractRunner, Signer } from "ethers";

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
